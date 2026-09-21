"use client";

import { useState } from "react";
import { seasonCoolingRoundLimit } from "@/lib/season-cooling";
import { useTournament } from "../hooks/TournamentContext";

export function SeasonCoolingAdmin() {
  const { data, season } = useTournament();
  const [deferredPlayers, setDeferredPlayers] = useState<string[]>([]);
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  if (!data || !season.data?.isOrganizer) return null;

  const { coolingProgress, penaltyCooling, participants } = season.data;
  const pending = coolingProgress.filter(
    (entry) => entry.pending_round_id !== null && !deferredPlayers.includes(entry.player_id),
  );
  const tournamentId = data.tournament.id;
  const playerNames = new Map(
    participants.map((player) => [player.discord_id, player.nickname]),
  );

  async function approve(playerId: string, roundId: number) {
    setSavingPlayerId(playerId);
    try {
      await season.mutate("POST", {
        entity: "cooling",
        tournamentId,
        playerId,
        roundId,
      });
    } finally {
      setSavingPlayerId(null);
    }
  }

  return (
    <section className="season-discipline-admin-block season-cooling-admin">
      <h4>Охлаждение огоньков</h4>
      <p>
        После {seasonCoolingRoundLimit} завершённых туров без нового штрафа подтвердите снятие одного
        огонька. «Решить позже» оставляет огонёк и запрос на следующий визит.
      </p>
      {pending.length === 0 ? (
        <p className="season-empty-copy">Запросов на охлаждение сейчас нет.</p>
      ) : (
        <div className="season-admin-record-list">
          {pending.map((entry) => (
            <article key={entry.player_id}>
              <div>
                <strong>{playerNames.get(entry.player_id) ?? entry.player_id}</strong>
                <span>
                  Три тура без новых огоньков · сейчас {entry.remaining_fires} 🔥
                </span>
              </div>
              <div className="season-cooling-actions">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={savingPlayerId === entry.player_id}
                  onClick={() =>
                    setDeferredPlayers((current) => [...current, entry.player_id])
                  }
                >
                  Решить позже
                </button>
                <button
                  className="secondary-button tournament-save-button"
                  type="button"
                  disabled={savingPlayerId === entry.player_id}
                  onClick={() => {
                    if (entry.pending_round_id !== null) {
                      void approve(entry.player_id, entry.pending_round_id);
                    }
                  }}
                >
                  Снять один огонёк
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {penaltyCooling.length > 0 && (
        <div className="season-cooling-history">
          <h5>Принятые решения</h5>
          {penaltyCooling.map((entry) => {
            const isInvalid = coolingProgress.some(
              (progress) =>
                progress.player_id === entry.player_id &&
                progress.invalid_round_numbers.includes(entry.round_number),
            );
            return (
              <p key={`${entry.player_id}-${entry.round_id}`}>
                {playerNames.get(entry.player_id) ?? entry.player_id} · тур{" "}
                {entry.round_number} ·{" "}
                {isInvalid ? "снятие отменено после изменения штрафов" : "огонёк снят"}
              </p>
            );
          })}
        </div>
      )}
    </section>
  );
}
