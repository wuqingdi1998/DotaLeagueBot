"use client";

import { useEffect, useId, useState } from "react";

export type SeasonAdminPlayerOption = {
  discord_id: string;
  dota_id: string;
  nickname: string;
  tier: number | null;
};

export function SeasonAdminPlayerPicker({
  label,
  initialValue = "",
  onSelect,
}: {
  label: string;
  initialValue?: string;
  onSelect: (player: SeasonAdminPlayerOption | null) => void;
}) {
  const listId = useId();
  const [search, setSearch] = useState(initialValue);
  const [options, setOptions] = useState<SeasonAdminPlayerOption[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const value = search.trim();
    if (value.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/season/players?q=${encodeURIComponent(value)}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) return;
        const result = (await response.json()) as {
          players?: SeasonAdminPlayerOption[];
        };
        setOptions(result.players ?? []);
      } catch {
        if (!controller.signal.aborted) setOptions([]);
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  return (
    <label className="season-admin-player-picker">
      <span>{label}</span>
      <input
        value={search}
        role="combobox"
        aria-controls={listId}
        aria-expanded={isFocused && search.trim().length >= 2}
        autoComplete="off"
        placeholder="Ник, Discord ID или Dota ID"
        onBlur={() => setIsFocused(false)}
        onChange={(event) => {
          setSearch(event.target.value);
          onSelect(null);
        }}
        onFocus={() => setIsFocused(true)}
      />
      {isFocused && search.trim().length >= 2 && (
        <ul id={listId} role="listbox">
          {options.map((player) => (
            <li key={player.discord_id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setSearch(player.nickname);
                  setIsFocused(false);
                  onSelect(player);
                }}
              >
                <strong>{player.nickname}</strong>
                <span>тир {player.tier ?? "—"}</span>
              </button>
            </li>
          ))}
          {!options.length && <li className="empty">Игрок не найден</li>}
        </ul>
      )}
    </label>
  );
}
