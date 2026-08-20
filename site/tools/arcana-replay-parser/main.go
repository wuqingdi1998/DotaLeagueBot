package main

import (
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
)

const maxCompressedReplayBytes = 256 << 20

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

func parseReplay(reader io.Reader) (parserResult, error) {
	parser, err := manta.NewStreamParser(reader)
	if err != nil {
		return parserResult{}, err
	}
	unique := make(map[string]wearable)
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
	if err := parser.Start(); err != nil {
		return parserResult{}, err
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
	return parseReplay(bzip2.NewReader(compressed))
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
