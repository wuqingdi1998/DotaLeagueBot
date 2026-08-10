"use client";

import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";

type PlayerOption = {
  ingame_name: string;
  tier: number | null;
  tier_status: string;
};

type PlayerAutocompleteProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onTierResolved: (tier: number | null) => void;
};

const minimumPlayerSearchLength = 2;

export function PlayerAutocomplete({
  label,
  value,
  onChange,
  onTierResolved,
}: PlayerAutocompleteProps) {
  const listId = useId();
  const tierCallback = useRef(onTierResolved);
  const [options, setOptions] = useState<PlayerOption[]>([]);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    tierCallback.current = onTierResolved;
  }, [onTierResolved]);

  const exactOption = options.find(
    (option) => option.ingame_name.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
  );
  const menuOpen =
    focused && value.trim().length >= minimumPlayerSearchLength;

  useEffect(() => {
    const search = value.trim();
    if (search.length < minimumPlayerSearchLength) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/players?q=${encodeURIComponent(search)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result = (await response.json()) as { players?: PlayerOption[] };
        const nextOptions = result.players ?? [];
        setOptions(nextOptions);
        setActiveIndex(-1);
        const exact = nextOptions.find(
          (option) =>
            option.ingame_name.toLocaleLowerCase() === search.toLocaleLowerCase(),
        );
        tierCallback.current(
          exact?.tier_status === "current" ? exact.tier : null,
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  function selectPlayer(option: PlayerOption) {
    onChange(option.ingame_name);
    tierCallback.current(
      option.tier_status === "current" ? option.tier : null,
    );
    setFocused(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!menuOpen || options.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? options.length - 1 : current - 1,
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectPlayer(options[activeIndex]);
    } else if (event.key === "Escape") {
      setFocused(false);
    }
  }

  return (
    <label className="player-autocomplete">
      <span>{label}</span>
      <input
        required
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={menuOpen}
        aria-controls={listId}
        aria-activedescendant={
          activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
        }
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          tierCallback.current(null);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder="Игровой ник из базы бота"
        autoComplete="off"
      />
      {exactOption && (
        <small className="player-autocomplete-tier">
          {exactOption.tier_status === "current" && exactOption.tier !== null
            ? `Тир на момент регистрации: ${exactOption.tier}`
            : "Актуальный тир не подтверждён"}
        </small>
      )}
      {menuOpen && (
        <ul className="player-autocomplete-menu" id={listId} role="listbox">
          {options.map((option, index) => (
            <li key={option.ingame_name} role="presentation">
              <button
                id={`${listId}-option-${index}`}
                className={activeIndex === index ? "active" : ""}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectPlayer(option)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <strong>{option.ingame_name}</strong>
                <span>
                  {option.tier_status === "current" && option.tier !== null
                    ? `тир ${option.tier}`
                    : "тир не подтверждён"}
                </span>
              </button>
            </li>
          ))}
          {!loading && options.length === 0 && (
            <li className="player-autocomplete-empty">Игрок не найден</li>
          )}
          {loading && (
            <li className="player-autocomplete-empty">Ищем игрока…</li>
          )}
        </ul>
      )}
    </label>
  );
}
