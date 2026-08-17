"use client";

import { useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { useTournament } from "../hooks/TournamentContext";
import type { SeasonGame, SeasonMatch } from "../model/season-types";
import { seasonMatchStatusLabel } from "../model/season-labels";
import { SeasonSubstitutionAdmin } from "./SeasonSubstitutionAdmin";
import {
  SeasonCaptainPicker,
  SeasonTeamPicker,
  SeasonTierEditor,
  type SeasonTeamPlayerOption,
} from "./SeasonTeamSelection";

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function SeasonMatchAdmin({ match }: { match: SeasonMatch }) {
  const { season } = useTournament();
  const round = season.data?.rounds.find((item) => item.id === match.round_id);
  const selectablePlayers =
    round?.round_kind === "regular"
      ? round.registrations.map((player) => ({
          discord_id: player.player_id,
          ingame_name: player.nickname,
          avatar_url: player.avatar_url,
        }))
      : (season.data?.participants ?? []).map((player) => ({
          discord_id: player.discord_id,
          ingame_name: player.nickname,
          avatar_url: player.avatar_url,
        }));
  const availablePlayers = uniquePlayers([
    ...selectablePlayers,
    ...match.participants
      .map((participant) => ({
        discord_id: participant.player_id,
        ingame_name: participant.nickname,
        avatar_url: participant.avatar_url,
      })),
  ]);
  const initialTeamA = match.participants
    .filter((player) => player.team_side === "a")
    .map((player) => player.player_id);
  const initialTeamB = match.participants
    .filter((player) => player.team_side === "b")
    .map((player) => player.player_id);
  const [teamAName, setTeamAName] = useState(match.team_a_name);
  const [teamBName, setTeamBName] = useState(match.team_b_name);
  const [teamAPlayers, setTeamAPlayers] = useState(initialTeamA);
  const [teamBPlayers, setTeamBPlayers] = useState(initialTeamB);
  const [playerTierSnapshots, setPlayerTierSnapshots] = useState<
    Record<string, string>
  >(
    Object.fromEntries(
      match.participants.map((player) => [
        player.player_id,
        player.tier_snapshot?.toString() ?? "",
      ]),
    ),
  );
  const [teamACaptain, setTeamACaptain] = useState(
    match.participants.find(
      (player) => player.team_side === "a" && player.is_captain,
    )?.player_id ?? "",
  );
  const [teamBCaptain, setTeamBCaptain] = useState(
    match.participants.find(
      (player) => player.team_side === "b" && player.is_captain,
    )?.player_id ?? "",
  );
  const [scheduledAt, setScheduledAt] = useState(
    localDateTime(match.scheduled_at),
  );
  const [bestOf, setBestOf] = useState(match.best_of);
  const [teamAScore, setTeamAScore] = useState(
    match.team_a_score?.toString() ?? "",
  );
  const [teamBScore, setTeamBScore] = useState(
    match.team_b_score?.toString() ?? "",
  );
  const [result, setResult] = useState(match.result ?? "");
  const [status, setStatus] = useState(match.status);
  const [isSaving, setIsSaving] = useState(false);

  function updateTeamA(players: string[]) {
    setTeamAPlayers(players);
    if (teamACaptain && !players.includes(teamACaptain)) {
      setTeamACaptain("");
    }
  }

  function updateTeamB(players: string[]) {
    setTeamBPlayers(players);
    if (teamBCaptain && !players.includes(teamBCaptain)) {
      setTeamBCaptain("");
    }
  }

  function updatePlayerTier(playerId: string, tier: string) {
    setPlayerTierSnapshots((current) => ({
      ...current,
      [playerId]: tier,
    }));
  }

  async function save() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await season.mutate(
        "PATCH",
        {
          entity: "match",
          id: match.id,
          teamAName,
          teamBName,
          teamAPlayerIds: teamAPlayers,
          teamBPlayerIds: teamBPlayers,
          teamACaptainId: teamACaptain || null,
          teamBCaptainId: teamBCaptain || null,
          playerTierSnapshots: Object.fromEntries(
            [...teamAPlayers, ...teamBPlayers].map((playerId) => [
              playerId,
              playerTierSnapshots[playerId] ?? "",
            ]),
          ),
          scheduledAt,
          bestOf,
          teamAScore,
          teamBScore,
          result: result || null,
          status,
        },
        "Матч сохранён",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm("Удалить матч вместе с его картами?")) return;
    await season.mutate("DELETE", { entity: "match", id: match.id });
  }

  async function addGame() {
    const gameNumber =
      Math.max(0, ...match.games.map((game) => game.game_number)) + 1;
    await season.mutate("POST", {
      entity: "game",
      matchId: match.id,
      gameNumber,
      status: "draft",
    });
  }

  return (
    <details className="season-match-admin-card">
      <summary>
        <span>Матч {match.sort_order}</span>
        <strong>{match.team_a_name} — {match.team_b_name}</strong>
        <em>{seasonMatchStatusLabel(match.status)}</em>
      </summary>
      <div className="season-match-admin-content">
        <div className="season-admin-fields season-match-main-fields">
          <label>
            <span>Команда A</span>
            <input
              value={teamAName}
              onChange={(event) => setTeamAName(event.target.value)}
            />
          </label>
          <label>
            <span>Команда B</span>
            <input
              value={teamBName}
              onChange={(event) => setTeamBName(event.target.value)}
            />
          </label>
          <label>
            <span>Дата и время</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </label>
          <label>
            <span>Формат</span>
            <select
              value={bestOf}
              onChange={(event) => setBestOf(Number(event.target.value))}
            >
              {[1, 2, 3, 5].map((value) => (
                <option value={value} key={value}>BO{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Счёт A</span>
            <input
              type="number"
              min="0"
              value={teamAScore}
              onChange={(event) => setTeamAScore(event.target.value)}
            />
          </label>
          <label>
            <span>Счёт B</span>
            <input
              type="number"
              min="0"
              value={teamBScore}
              onChange={(event) => setTeamBScore(event.target.value)}
            />
          </label>
          <label>
            <span>Результат</span>
            <select value={result} onChange={(event) => setResult(event.target.value)}>
              <option value="">Не внесён</option>
              <option value="team_a">Победа команды A</option>
              <option value="draw">Ничья</option>
              <option value="team_b">Победа команды B</option>
            </select>
          </label>
          <label>
            <span>Статус</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as SeasonMatch["status"])
              }
            >
              <option value="draft">Черновик</option>
              <option value="published">Опубликован</option>
              <option value="completed">Завершён</option>
              <option value="cancelled">Отменён</option>
            </select>
          </label>
        </div>
        <div className="season-team-pickers">
          <SeasonTeamPicker
            label="Состав команды A"
            players={availablePlayers}
            selected={teamAPlayers}
            unavailablePlayerIds={teamBPlayers}
            onChange={updateTeamA}
          />
          <SeasonTeamPicker
            label="Состав команды B"
            players={availablePlayers}
            selected={teamBPlayers}
            unavailablePlayerIds={teamAPlayers}
            onChange={updateTeamB}
          />
          <SeasonCaptainPicker
            label="Капитан A"
            selected={teamACaptain}
            players={teamAPlayers}
            playerOptions={availablePlayers}
            onChange={setTeamACaptain}
          />
          <SeasonCaptainPicker
            label="Капитан B"
            selected={teamBCaptain}
            players={teamBPlayers}
            playerOptions={availablePlayers}
            onChange={setTeamBCaptain}
          />
          <SeasonTierEditor
            label="Тиры команды A на этот тур"
            players={teamAPlayers}
            playerOptions={availablePlayers}
            tierSnapshots={playerTierSnapshots}
            onChange={updatePlayerTier}
          />
          <SeasonTierEditor
            label="Тиры команды B на этот тур"
            players={teamBPlayers}
            playerOptions={availablePlayers}
            tierSnapshots={playerTierSnapshots}
            onChange={updatePlayerTier}
          />
        </div>
        <div className="season-admin-actions">
          <button
            className="secondary-button tournament-save-button"
            type="button"
            disabled={isSaving}
            aria-busy={isSaving}
            onClick={() => void save()}
          >
            {isSaving ? "Сохраняю…" : "Сохранить матч"}
          </button>
          <button className="secondary-button" onClick={() => void addGame()}>
            <FiPlus /> Добавить карту
          </button>
          <button className="danger-button" onClick={() => void remove()}>
            <FiTrash2 /> Удалить матч
          </button>
        </div>
        <div className="season-game-admin-list">
          {match.games.map((game) => (
            <SeasonGameAdmin game={game} key={game.id} />
          ))}
        </div>
        <SeasonSubstitutionAdmin match={match} />
      </div>
    </details>
  );
}

function uniquePlayers(players: SeasonTeamPlayerOption[]) {
  return [
    ...new Map(
      players.map((player) => [player.discord_id, player] as const),
    ).values(),
  ];
}

function SeasonGameAdmin({ game }: { game: SeasonGame }) {
  const { season } = useTournament();
  const [gameNumber, setGameNumber] = useState(game.game_number);
  const [dotaMatchId, setDotaMatchId] = useState(game.dota_match_id ?? "");
  const [winnerSide, setWinnerSide] = useState(game.winner_side ?? "");
  const [durationSeconds, setDurationSeconds] = useState(
    game.duration_seconds?.toString() ?? "",
  );
  const [status, setStatus] = useState(game.status);

  async function save() {
    await season.mutate("PATCH", {
      entity: "game",
      id: game.id,
      gameNumber,
      dotaMatchId,
      winnerSide: winnerSide || null,
      durationSeconds,
      status,
    });
  }

  async function remove() {
    if (!window.confirm("Удалить эту карту?")) return;
    await season.mutate("DELETE", { entity: "game", id: game.id });
  }

  return (
    <div className="season-game-admin-row">
      <label>
        <span>Карта</span>
        <input
          type="number"
          min="1"
          max="20"
          value={gameNumber}
          onChange={(event) => setGameNumber(Number(event.target.value))}
        />
      </label>
      <label>
        <span>Dota 2 Match ID</span>
        <input
          inputMode="numeric"
          value={dotaMatchId}
          onChange={(event) => setDotaMatchId(event.target.value)}
        />
      </label>
      <label>
        <span>Победитель</span>
        <select
          value={winnerSide}
          onChange={(event) => setWinnerSide(event.target.value)}
        >
          <option value="">Не указан</option>
          <option value="a">Команда A</option>
          <option value="draw">Ничья</option>
          <option value="b">Команда B</option>
        </select>
      </label>
      <label>
        <span>Длительность, сек.</span>
        <input
          type="number"
          min="0"
          value={durationSeconds}
          onChange={(event) => setDurationSeconds(event.target.value)}
        />
      </label>
      <label>
        <span>Статус</span>
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as SeasonGame["status"])
          }
        >
          <option value="draft">Черновик</option>
          <option value="published">Опубликована</option>
          <option value="completed">Завершена</option>
          <option value="cancelled">Отменена</option>
        </select>
      </label>
      <div>
        <button
          className="secondary-button tournament-save-button"
          onClick={() => void save()}
        >
          Сохранить
        </button>
        <button className="danger-button" onClick={() => void remove()}>
          <FiTrash2 />
        </button>
      </div>
    </div>
  );
}
