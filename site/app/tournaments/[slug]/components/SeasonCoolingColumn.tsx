"use client";

import { useState } from "react";
import { FiAlertCircle } from "react-icons/fi";
import { seasonCoolingFloors, seasonCoolingRoundLimit } from "@/lib/season-cooling";
import { useTournament } from "../hooks/TournamentContext";
import type { SeasonCoolingProgress } from "../model/season-types";

const coolingExplanation =
  `После ${seasonCoolingRoundLimit} завершённых туров подряд без новых огоньков ` +
  "и внесения всех результатов организатор может снять один огонёк. " +
  `Охлаждение не опускает число огоньков ниже ближайшей границы: ${seasonCoolingFloors.join(", ")}. ` +
  "Новый огонёк сбрасывает счётчик.";

export function SeasonCoolingHeader() {
  return (
    <th>
      <abbr className="season-cooling-heading" title={coolingExplanation} tabIndex={0}>
        Охлаждение
      </abbr>
    </th>
  );
}

export function SeasonCoolingCell({
  playerId,
  playerName,
  progress,
}: {
  playerId: string;
  playerName: string;
  progress?: SeasonCoolingProgress;
}) {
  const { data, season } = useTournament();
  const [openRoundId, setOpenRoundId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const pendingRoundId = progress?.pending_round_id ?? null;
  const isMenuOpen = pendingRoundId !== null && openRoundId === pendingRoundId;
  const label = pendingRoundId === null
    ? `${progress?.progress ?? 0}/${seasonCoolingRoundLimit}`
    : `${seasonCoolingRoundLimit}/${seasonCoolingRoundLimit}`;

  async function approveCooling() {
    if (!data || pendingRoundId === null || isSaving) return;
    setIsSaving(true);
    try {
      const result = await season.mutate("POST", {
        entity: "cooling",
        tournamentId: data.tournament.id,
        playerId,
        roundId: pendingRoundId,
      }, "Один огонёк снят");
      if (result.ok) setOpenRoundId(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <td className="season-cooling-cell">
      <div className="season-cooling-value">
        <span aria-hidden="true">❄️</span>
        <span>{label}</span>
        {season.data?.isOrganizer && pendingRoundId !== null && (
          <button
            className="season-cooling-alert"
            type="button"
            aria-label={`Решить охлаждение огоньков игрока ${playerName}`}
            aria-expanded={isMenuOpen}
            title="Тур завершён, все результаты внесены. Решите, снимать ли огонёк."
            onClick={() => setOpenRoundId(isMenuOpen ? null : pendingRoundId)}
          >
            <FiAlertCircle aria-hidden="true" />
          </button>
        )}
      </div>
      {season.data?.isOrganizer && isMenuOpen && (
        <div className="season-cooling-options">
          <button type="button" disabled={isSaving} onClick={() => void approveCooling()}>
            Охладить
          </button>
          <button type="button" disabled={isSaving} onClick={() => setOpenRoundId(null)}>
            Добавлю огонёк в этом туре
          </button>
        </div>
      )}
    </td>
  );
}
