"use client";

import { FiShuffle } from "react-icons/fi";
import { useTournament } from "../hooks/TournamentContext";

export function GroupShuffleToolbar() {
  const { approvedTeams, generateGroups } = useTournament();

  return (
    <div className="admin-toolbar group-shuffle-toolbar">
      <div>
        <strong>Распределение команд</strong>
        <span>
          Шаффл случайно распределит {approvedTeams.length} допущенных команд и
          заново создаст все матчи группового этапа.
        </span>
      </div>
      <button
        className="secondary-button"
        type="button"
        onClick={() => void generateGroups("shuffle")}
      >
        <FiShuffle aria-hidden="true" />
        Шаффл
      </button>
    </div>
  );
}
