package main

import (
	"bytes"
	"io"
	"testing"

	"github.com/dotabuff/manta/dota"
	"github.com/klauspost/compress/zstd"
)

func TestValidateReplayURL(t *testing.T) {
	valid := []string{
		"http://replay123.valve.net/570/8955030491_123456.dem.bz2",
		"https://replay413.dota2.com.cn/570/8955030491_123456.dem.bz2",
	}
	for _, raw := range valid {
		if _, err := validateReplayURL(raw); err != nil {
			t.Fatalf("expected %q to be valid: %v", raw, err)
		}
	}
	invalid := []string{
		"https://example.com/570/1_2.dem.bz2",
		"https://replay123.valve.net@127.0.0.1/570/1_2.dem.bz2",
		"https://replay123.valve.net/570/../../secret",
		"https://replay123.valve.net/570/1_2.dem.bz2?next=http://127.0.0.1",
	}
	for _, raw := range invalid {
		if _, err := validateReplayURL(raw); err == nil {
			t.Fatalf("expected %q to be rejected", raw)
		}
	}
}

func TestFieldWithSuffixSupportsNestedWearableFields(t *testing.T) {
	fields := map[string]any{
		"m_AttributeManager.m_Item.m_iAccountID":           uint32(1674981969),
		"m_AttributeManager.m_Item.m_iItemDefinitionIndex": uint32(6996),
	}
	accountID, hasAccount := fieldWithSuffix(fields, "m_iAccountID")
	itemID, hasItem := fieldWithSuffix(fields, "m_iItemDefinitionIndex")
	if !hasAccount || accountID != 1674981969 || !hasItem || itemID != 6996 {
		t.Fatalf("unexpected wearable fields: account=%d item=%d", accountID, itemID)
	}
}

func TestAccountIDFromSteamID(t *testing.T) {
	accountID, ok := accountIDFromSteamID(76561199635247697)
	if !ok || accountID != "1674981969" {
		t.Fatalf("unexpected account ID: %q", accountID)
	}
	if _, ok := accountIDFromSteamID(1); ok {
		t.Fatal("expected an invalid Steam ID to be rejected")
	}
}

func TestReplayMetadataContainsEquippedWearables(t *testing.T) {
	fileInfo := &dota.CDemoFileInfo{
		GameInfo: &dota.CGameInfo{
			Dota: &dota.CGameInfo_CDotaGameInfo{
				PlayerInfo: []*dota.CGameInfo_CDotaGameInfo_CPlayerInfo{
					{Steamid: pointer(uint64(76561199635247697))},
				},
			},
		},
	}
	accounts := playerAccounts(fileInfo)
	if accounts[0] != "1674981969" {
		t.Fatalf("unexpected player account: %q", accounts[0])
	}

	metadata := &dota.CDOTAMatchMetadataFile{
		Metadata: &dota.CDOTAMatchMetadata{
			Teams: []*dota.CDOTAMatchMetadata_Team{
				{
					Players: []*dota.CDOTAMatchMetadata_Team_Player{
						{
							GamePlayerId: pointer(int32(0)),
							PlayerSlot:   pointer(uint32(0)),
							EquippedEconItems: []*dota.CDOTAMatchMetadata_EconItem{
								{DefIndex: pointer(uint32(6996))},
							},
						},
					},
				},
			},
		},
	}
	wearables := equippedMetadataWearables(metadata)
	if len(wearables) != 1 || wearables[0].gamePlayerID != 0 || wearables[0].itemID != 6996 {
		t.Fatalf("unexpected metadata wearables: %#v", wearables)
	}
}

func pointer[T any](value T) *T {
	return &value
}

func TestNewReplayReaderSupportsBzip2(t *testing.T) {
	compressed := []byte{
		66, 90, 104, 57, 49, 65, 89, 38, 83, 89, 54, 233, 109, 194, 0, 0,
		1, 145, 128, 64, 0, 38, 4, 212, 32, 32, 0, 34, 0, 54, 161, 0,
		48, 133, 128, 114, 65, 226, 238, 72, 167, 10, 18, 6, 221, 45, 184, 64,
	}
	assertReplayReaderContent(t, compressed, "dota replay")
}

func TestNewReplayReaderSupportsZstandard(t *testing.T) {
	encoder, err := zstd.NewWriter(nil)
	if err != nil {
		t.Fatalf("create zstandard encoder: %v", err)
	}
	t.Cleanup(func() { encoder.Close() })
	compressed := encoder.EncodeAll([]byte("dota replay"), nil)
	assertReplayReaderContent(t, compressed, "dota replay")
}

func TestNewReplayReaderRejectsUnknownCompression(t *testing.T) {
	if _, _, err := newReplayReader(bytes.NewReader([]byte("nope"))); err == nil {
		t.Fatal("expected unknown replay compression to be rejected")
	}
}

func assertReplayReaderContent(t *testing.T, compressed []byte, expected string) {
	t.Helper()
	reader, closeReader, err := newReplayReader(bytes.NewReader(compressed))
	if err != nil {
		t.Fatalf("create replay reader: %v", err)
	}
	t.Cleanup(closeReader)
	decoded, err := io.ReadAll(reader)
	if err != nil {
		t.Fatalf("read replay: %v", err)
	}
	if string(decoded) != expected {
		t.Fatalf("unexpected replay content: %q", decoded)
	}
}
