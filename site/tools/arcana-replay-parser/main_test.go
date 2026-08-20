package main

import "testing"

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
		"m_AttributeManager.m_Item.m_iAccountID":          uint32(1674981969),
		"m_AttributeManager.m_Item.m_iItemDefinitionIndex": uint32(6996),
	}
	accountID, hasAccount := fieldWithSuffix(fields, "m_iAccountID")
	itemID, hasItem := fieldWithSuffix(fields, "m_iItemDefinitionIndex")
	if !hasAccount || accountID != 1674981969 || !hasItem || itemID != 6996 {
		t.Fatalf("unexpected wearable fields: account=%d item=%d", accountID, itemID)
	}
}
