"use client";

import { useMemo, useState } from "react";
import { FiSearch, FiUserCheck } from "react-icons/fi";
import { AvatarImage } from "@/app/components/AvatarImage";

export type SeasonTeamPlayerOption = {
  discord_id: string;
  ingame_name: string;
  avatar_url: string | null;
};

export function SeasonTeamPicker({
  label,
  onChange,
  players,
  selected,
  unavailablePlayerIds,
}: {
  label: string;
  onChange: (players: string[]) => void;
  players: SeasonTeamPlayerOption[];
  selected: string[];
  unavailablePlayerIds: string[];
}) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("ru");
  const unavailable = new Set(unavailablePlayerIds);
  const hasFivePlayers = selected.length >= 5;
  const filteredPlayers = useMemo(
    () =>
      players
        .filter((player) =>
          player.ingame_name
            .toLocaleLowerCase("ru")
            .includes(normalizedSearch),
        )
        .sort((left, right) => {
          const selectionOrder =
            Number(selected.includes(right.discord_id)) -
            Number(selected.includes(left.discord_id));
          return (
            selectionOrder ||
            left.ingame_name.localeCompare(right.ingame_name, "ru")
          );
        }),
    [normalizedSearch, players, selected],
  );

  function toggle(playerId: string) {
    if (selected.includes(playerId)) {
      onChange(selected.filter((id) => id !== playerId));
      return;
    }
    if (hasFivePlayers || unavailable.has(playerId)) return;
    onChange([...selected, playerId]);
  }

  return (
    <fieldset className="season-team-picker">
      <legend>
        <span>{label}</span>
        <b className={hasFivePlayers ? "complete" : ""}>
          {selected.length}/5
        </b>
      </legend>
      <label className="season-team-search">
        <FiSearch aria-hidden="true" />
        <input
          value={search}
          placeholder="Поиск по никнейму"
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="season-team-player-list">
        {filteredPlayers.map((player) => {
          const isSelected = selected.includes(player.discord_id);
          const isUnavailable = unavailable.has(player.discord_id);
          const isDisabled = !isSelected && (isUnavailable || hasFivePlayers);
          return (
            <label
              className={`${isSelected ? "selected" : ""}${
                isUnavailable ? " unavailable" : ""
              }`}
              key={player.discord_id}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => toggle(player.discord_id)}
              />
              <AvatarImage
                source={player.avatar_url}
                width={34}
                height={34}
                alt=""
                fallback={
                  <i>{player.ingame_name.slice(0, 1).toUpperCase()}</i>
                }
              />
              <span>
                <strong>{player.ingame_name}</strong>
                <small>
                  {isUnavailable
                    ? "Уже в другой команде"
                    : isSelected
                      ? "Добавлен в состав"
                      : "Доступен"}
                </small>
              </span>
              {isSelected && <FiUserCheck aria-label="Выбран" />}
            </label>
          );
        })}
        {!filteredPlayers.length && (
          <p>Среди участников сезона ничего не найдено.</p>
        )}
      </div>
    </fieldset>
  );
}

export function SeasonCaptainPicker({
  label,
  onChange,
  playerOptions,
  players,
  selected,
}: {
  label: string;
  onChange: (playerId: string) => void;
  playerOptions: SeasonTeamPlayerOption[];
  players: string[];
  selected: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={selected} onChange={(event) => onChange(event.target.value)}>
        <option value="">Не назначен</option>
        {playerOptions
          .filter((player) => players.includes(player.discord_id))
          .map((player) => (
            <option value={player.discord_id} key={player.discord_id}>
              {player.ingame_name}
            </option>
          ))}
      </select>
    </label>
  );
}

export function SeasonTierEditor({
  label,
  onChange,
  playerOptions,
  players,
  tierSnapshots,
}: {
  label: string;
  onChange: (playerId: string, tier: string) => void;
  playerOptions: SeasonTeamPlayerOption[];
  players: string[];
  tierSnapshots: Record<string, string>;
}) {
  const optionsById = new Map(
    playerOptions.map((player) => [player.discord_id, player] as const),
  );
  return (
    <fieldset className="season-tier-editor">
      <legend>{label}</legend>
      {players.map((playerId) => (
        <label key={playerId}>
          <span>{optionsById.get(playerId)?.ingame_name ?? playerId}</span>
          <input
            type="number"
            min="0"
            max="12"
            inputMode="numeric"
            aria-label={`Тир игрока ${optionsById.get(playerId)?.ingame_name ?? playerId} на этот тур`}
            value={tierSnapshots[playerId] ?? ""}
            onChange={(event) => onChange(playerId, event.target.value)}
          />
        </label>
      ))}
      {!players.length && (
        <p>Сначала выберите игроков команды, затем укажите их тиры.</p>
      )}
    </fieldset>
  );
}
