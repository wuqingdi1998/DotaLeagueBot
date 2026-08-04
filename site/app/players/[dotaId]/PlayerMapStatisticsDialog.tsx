"use client";

import { useRef } from "react";
import { FiX } from "react-icons/fi";
import type { PlayerTournamentMapStatistics } from "@/lib/player-map-statistics";

type PlayerMapStatisticsDialogProps = {
  winRate: number;
  tournaments: PlayerTournamentMapStatistics[];
};

export function PlayerMapStatisticsDialog({
  winRate,
  tournaments,
}: PlayerMapStatisticsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openDialog() {
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  return (
    <article className="profile-win-rate-stat">
      <button
        type="button"
        className="profile-win-rate-trigger"
        aria-haspopup="dialog"
        onClick={openDialog}
      >
        <span>Победный процент</span>
        <strong>{winRate}%</strong>
      </button>

      <dialog
        ref={dialogRef}
        className="profile-map-statistics-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
      >
        <section>
          <header>
            <h2>Карты по турнирам</h2>
            <button
              type="button"
              aria-label="Закрыть статистику по картам"
              onClick={closeDialog}
            >
              <FiX aria-hidden="true" />
            </button>
          </header>
          <div className="profile-map-statistics-heading" aria-hidden="true">
            <span>Турнир</span>
            <span>Карты</span>
            <span>Победы</span>
          </div>
          <ul>
            {tournaments.map((tournament) => (
              <li key={tournament.tournamentId}>
                <strong>{tournament.tournamentName}</strong>
                <span>{tournament.maps}</span>
                <span>{tournament.mapWins}</span>
              </li>
            ))}
          </ul>
        </section>
      </dialog>
    </article>
  );
}
