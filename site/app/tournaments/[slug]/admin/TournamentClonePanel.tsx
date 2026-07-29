"use client";

import { useState } from "react";
import { FiCopy } from "react-icons/fi";
import { useTournament } from "../hooks/TournamentContext";

export function TournamentClonePanel() {
  const { data, setToast } = useTournament();
  const [isCloning, setIsCloning] = useState(false);
  if (!data) return null;
  const tournamentId = data.tournament.id;

  async function cloneTournament() {
    if (
      !window.confirm(
        "Создать новый черновик с такими же настройками, расписанием, правилами и призовыми?",
      )
    ) {
      return;
    }
    setIsCloning(true);
    try {
      const response = await fetch("/api/admin/tournament-clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId }),
      });
      const payload = (await response.json()) as {
        error?: string;
        slug?: string;
      };
      if (!response.ok || !payload.slug) {
        throw new Error(payload.error || "Не удалось клонировать турнир");
      }
      window.location.assign(`/tournaments/${payload.slug}?manage=1`);
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Не удалось клонировать турнир",
      );
      setIsCloning(false);
    }
  }

  return (
    <section className="tournament-clone-panel">
      <div>
        <p className="card-kicker">Новый турнир на основе этого</p>
        <h3>Клонировать турнир</h3>
        <p>
          Перенесутся основная информация, расписание, правила и тексты
          призовых. Команды, составы, тиры, матчи и результаты не переносятся.
        </p>
      </div>
      <button
        className="secondary-button"
        type="button"
        disabled={isCloning}
        onClick={() => void cloneTournament()}
      >
        <FiCopy aria-hidden="true" />
        {isCloning ? "Создаём копию…" : "Клонировать"}
      </button>
    </section>
  );
}
