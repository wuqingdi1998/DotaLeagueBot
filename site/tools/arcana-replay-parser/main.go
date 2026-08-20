package main

import (
	"bufio"
	"bytes"
	"compress/bzip2"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/dotabuff/manta"
	"github.com/dotabuff/manta/dota"
	"github.com/klauspost/compress/zstd"
)

const (
	maxCompressedReplayBytes = 256 << 20
	maxReplayDecoderMemory   = 256 << 20
	steamID64AccountBase     = 76561197960265728
)

var zstandardMagic = []byte{0x28, 0xb5, 0x2f, 0xfd}

var (
	replayHostPattern = regexp.MustCompile(`^replay[0-9]+\.(?:valve\.net|dota2\.com\.cn)$`)
	replayPathPattern = regexp.MustCompile(`^/570/[0-9]+_[0-9]+\.dem\.bz2$`)
)

type wearable struct {
	AccountID string `json:"accountId"`
	ItemID    uint64 `json:"itemId"`
}

type parserResult struct {
	HasWearableData bool       `json:"hasWearableData"`
	Wearables       []wearable `json:"wearables"`
}

type slottedWearable struct {
	gamePlayerID int
	playerSlot   int
	itemID       uint64
}

func validateReplayURL(raw string) (*url.URL, error) {
	parsed, err := url.Parse(raw)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return nil, errors.New("invalid replay URL")
	}
	if parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" || parsed.Port() != "" {
		return nil, errors.New("invalid replay URL")
	}
	if !replayHostPattern.MatchString(strings.ToLower(parsed.Hostname())) ||
		!replayPathPattern.MatchString(parsed.EscapedPath()) {
		return nil, errors.New("replay URL is outside the allowed Valve hosts")
	}
	return parsed, nil
}

func uintValue(value any) (uint64, bool) {
	switch number := value.(type) {
	case uint8:
		return uint64(number), true
	case uint16:
		return uint64(number), true
	case uint32:
		return uint64(number), true
	case uint64:
		return number, true
	case int8:
		return uint64(number), number >= 0
	case int16:
		return uint64(number), number >= 0
	case int32:
		return uint64(number), number >= 0
	case int64:
		return uint64(number), number >= 0
	case int:
		return uint64(number), number >= 0
	default:
		return 0, false
	}
}

func fieldWithSuffix(fields map[string]any, suffix string) (uint64, bool) {
	for name, value := range fields {
		if name == suffix || strings.HasSuffix(name, "."+suffix) {
			return uintValue(value)
		}
	}
	return 0, false
}

func accountIDFromSteamID(steamID uint64) (string, bool) {
	if steamID <= steamID64AccountBase || steamID-steamID64AccountBase > uint64(^uint32(0)) {
		return "", false
	}
	return fmt.Sprint(steamID - steamID64AccountBase), true
}

func playerAccounts(message *dota.CDemoFileInfo) map[int]string {
	accounts := make(map[int]string)
	players := message.GetGameInfo().GetDota().GetPlayerInfo()
	for gamePlayerID, player := range players {
		if accountID, ok := accountIDFromSteamID(player.GetSteamid()); ok {
			accounts[gamePlayerID] = accountID
		}
	}
	return accounts
}

func equippedMetadataWearables(message *dota.CDOTAMatchMetadataFile) []slottedWearable {
	var wearables []slottedWearable
	for _, team := range message.GetMetadata().GetTeams() {
		for _, player := range team.GetPlayers() {
			gamePlayerID := -1
			if player.GamePlayerId != nil {
				gamePlayerID = int(player.GetGamePlayerId())
			}
			for _, item := range player.GetEquippedEconItems() {
				if item.GetDefIndex() == 0 {
					continue
				}
				wearables = append(wearables, slottedWearable{
					gamePlayerID: gamePlayerID,
					playerSlot:   int(player.GetPlayerSlot()),
					itemID:       uint64(item.GetDefIndex()),
				})
			}
		}
	}
	return wearables
}

func parseReplay(reader io.Reader) (parserResult, error) {
	parser, err := manta.NewStreamParser(reader)
	if err != nil {
		return parserResult{}, err
	}
	unique := make(map[string]wearable)
	accountsByGamePlayerID := make(map[int]string)
	var metadataWearables []slottedWearable
	parser.OnEntity(func(entity *manta.Entity, _ manta.EntityOp) error {
		if entity.GetClassName() != "CDOTAWearableItem" {
			return nil
		}
		fields := entity.Map()
		accountID, hasAccount := fieldWithSuffix(fields, "m_iAccountID")
		itemID, hasItem := fieldWithSuffix(fields, "m_iItemDefinitionIndex")
		if hasAccount && hasItem && accountID > 0 && itemID > 0 {
			key := fmt.Sprintf("%d:%d", accountID, itemID)
			unique[key] = wearable{AccountID: fmt.Sprint(accountID), ItemID: itemID}
		}
		return nil
	})
	parser.Callbacks.OnCDemoFileInfo(func(message *dota.CDemoFileInfo) error {
		for gamePlayerID, accountID := range playerAccounts(message) {
			accountsByGamePlayerID[gamePlayerID] = accountID
		}
		return nil
	})
	parser.Callbacks.OnCDOTAMatchMetadataFile(func(message *dota.CDOTAMatchMetadataFile) error {
		metadataWearables = append(
			metadataWearables,
			equippedMetadataWearables(message)...,
		)
		return nil
	})
	if err := parser.Start(); err != nil {
		return parserResult{}, err
	}
	for _, item := range metadataWearables {
		var accountID string
		if item.gamePlayerID >= 0 {
			accountID = accountsByGamePlayerID[item.gamePlayerID]
		} else {
			accountID = accountsByGamePlayerID[item.playerSlot]
		}
		if accountID == "" {
			continue
		}
		key := fmt.Sprintf("%s:%d", accountID, item.itemID)
		unique[key] = wearable{AccountID: accountID, ItemID: item.itemID}
	}
	wearables := make([]wearable, 0, len(unique))
	for _, item := range unique {
		wearables = append(wearables, item)
	}
	sort.Slice(wearables, func(i, j int) bool {
		if wearables[i].AccountID == wearables[j].AccountID {
			return wearables[i].ItemID < wearables[j].ItemID
		}
		return wearables[i].AccountID < wearables[j].AccountID
	})
	return parserResult{HasWearableData: len(wearables) > 0, Wearables: wearables}, nil
}

func newReplayReader(compressed io.Reader) (io.Reader, func(), error) {
	buffered := bufio.NewReader(compressed)
	magic, err := buffered.Peek(4)
	if err != nil {
		return nil, nil, fmt.Errorf("replay compression header is unavailable: %w", err)
	}
	if bytes.HasPrefix(magic, []byte("BZh")) {
		return bzip2.NewReader(buffered), func() {}, nil
	}
	if bytes.Equal(magic, zstandardMagic) {
		decoder, decoderErr := zstd.NewReader(
			buffered,
			zstd.WithDecoderConcurrency(1),
			zstd.WithDecoderLowmem(true),
			zstd.WithDecoderMaxMemory(maxReplayDecoderMemory),
		)
		if decoderErr != nil {
			return nil, nil, fmt.Errorf("zstandard replay decoder failed: %w", decoderErr)
		}
		return decoder, decoder.Close, nil
	}
	return nil, nil, fmt.Errorf("unsupported replay compression: %x", magic)
}

func downloadAndParse(rawURL string) (parserResult, error) {
	replayURL, err := validateReplayURL(rawURL)
	if err != nil {
		return parserResult{}, err
	}
	client := &http.Client{
		Timeout: 3 * time.Minute,
		CheckRedirect: func(request *http.Request, _ []*http.Request) error {
			_, redirectErr := validateReplayURL(request.URL.String())
			return redirectErr
		},
	}
	response, err := client.Get(replayURL.String())
	if err != nil {
		return parserResult{}, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return parserResult{}, fmt.Errorf("replay download returned HTTP %d", response.StatusCode)
	}
	compressed := io.LimitReader(response.Body, maxCompressedReplayBytes+1)
	replay, closeReplay, err := newReplayReader(compressed)
	if err != nil {
		return parserResult{}, err
	}
	defer closeReplay()
	return parseReplay(replay)
}

func run(args []string, output io.Writer) error {
	if len(args) != 1 {
		return errors.New("usage: arcana-replay-parser <replay-url>")
	}
	result, err := downloadAndParse(args[0])
	if err != nil {
		return err
	}
	return json.NewEncoder(output).Encode(result)
}

func main() {
	if err := run(os.Args[1:], os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
