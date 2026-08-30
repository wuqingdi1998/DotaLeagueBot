"use client";

import { useState } from "react";
import { FiSettings } from "react-icons/fi";
import { useTournament } from "../hooks/TournamentContext";
import type { SeasonLobby } from "../model/season-types";
import { SeasonSubstitutionAdmin } from "./SeasonSubstitutionAdmin";

type EditableGame = {
  gameNumber: number;
  dotaMatchId: string;
  winnerSide: "" | "a" | "b";
};

export function SeasonPublishedLobbyTools({
  lobby,
  isOpenByDefault = false,
}: {
  lobby: SeasonLobby;
  isOpenByDefault?: boolean;
}) {
  const { season } = useTournament();
  const match = lobby.matches[0];
  const [games, setGames] = useState<EditableGame[]>(() =>
    [1, 2].map((gameNumber) => {
      const game = match?.games.find((item) => item.game_number === gameNumber);
      return {
        gameNumber,
        dotaMatchId: game?.dota_match_id ?? "",
        winnerSide:
          game?.winner_side === "a" || game?.winner_side === "b"
            ? game.winner_side
            : "",
      };
    }),
  );
  const [teamAScore, setTeamAScore] = useState(
    match?.team_a_score?.toString() ?? "",
  );
  const [teamBScore, setTeamBScore] = useState(
    match?.team_b_score?.toString() ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);
  if (!season.data?.isOrganizer || !match) return null;

  function updateGame(index: number, values: Partial<EditableGame>) {
    setGames((current) =>
      current.map((game, gameIndex) =>
        gameIndex === index ? { ...game, ...values } : game,
      ),
    );
  }

  async function saveResult() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await season.mutate(
        "PATCH",
        {
          entity: "publishedLobby",
          matchId: match.id,
          teamAScore,
          teamBScore,
          games,
        },
        `Результат «${lobby.name}» сохранён`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  const matchIds = games.map((game) => game.dotaMatchId || "—").join(" / ");
  const score = `${match.team_a_score ?? "—"}:${match.team_b_score ?? "—"}`;

  return (
    <details className="season-published-lobby-tools" open={isOpenByDefault}>
      <summary>
        <FiSettings aria-hidden="true" />
        <span>{lobby.name} · счёт {score}</span>
        <small>ID: {matchIds}</small>
      </summary>
      <section className="season-published-result-editor">
        <div>
          <h5>Результат лобби</h5>
          <p>
            Изменение счёта или победителей карт сразу пересчитает таблицу сезона.
          </p>
        </div>
        <div className="season-published-score-fields">
          <label>
            <span>Счёт команды A</span>
            <input
              type="number"
              min="0"
              max="2"
              value={teamAScore}
              onChange={(event) => setTeamAScore(event.target.value)}
            />
          </label>
          <label>
            <span>Счёт команды B</span>
            <input
              type="number"
              min="0"
              max="2"
              value={teamBScore}
              onChange={(event) => setTeamBScore(event.target.value)}
            />
          </label>
        </div>
        <div className="season-published-game-fields">
          {games.map((game, index) => (
            <fieldset key={game.gameNumber}>
              <legend>Карта {game.gameNumber}</legend>
              <label>
                <span>Dota 2 Match ID</span>
                <input
                  inputMode="numeric"
                  value={game.dotaMatchId}
                  onChange={(event) =>
                    updateGame(index, { dotaMatchId: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Победитель карты</span>
                <select
                  value={game.winnerSide}
                  onChange={(event) =>
                    updateGame(index, {
                      winnerSide: event.target.value as EditableGame["winnerSide"],
                    })
                  }
                >
                  <option value="">Не указан</option>
                  <option value="a">Команда A</option>
                  <option value="b">Команда B</option>
                </select>
              </label>
            </fieldset>
          ))}
        </div>
        <button
          className="secondary-button tournament-save-button"
          type="button"
          disabled={isSaving}
          onClick={() => void saveResult()}
        >
          {isSaving ? "Сохраняем…" : "Сохранить счёт и карты"}
        </button>
      </section>
      <SeasonSubstitutionAdmin match={match} />
    </details>
  );
}
