"use client";

import { useState, type FormEvent } from "react";
import { FiClock, FiSave } from "react-icons/fi";
import { toMoscowDateTimeInput } from "@/lib/moscow-date-time";
import { useTournament } from "../hooks/TournamentContext";
import type { SeasonLobby } from "../model/season-types";

export function SeasonLobbyScheduleEditor({ lobby }: { lobby: SeasonLobby }) {
  const { season } = useTournament();
  const [scheduledAt, setScheduledAt] = useState(
    toMoscowDateTimeInput(lobby.scheduled_at),
  );
  const [isSaving, setIsSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      await season.mutate(
        "PATCH",
        {
          entity: "lobby",
          id: lobby.id,
          name: lobby.name,
          status: lobby.status,
          scheduledAt,
        },
        "Время старта лобби сохранено",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="season-builder-lobby-schedule" onSubmit={save}>
      <label>
        <span><FiClock aria-hidden="true" /> Старт лобби</span>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(event) => setScheduledAt(event.target.value)}
        />
      </label>
      <button className="secondary-button compact" type="submit" disabled={isSaving}>
        <FiSave aria-hidden="true" /> {isSaving ? "Сохраняем…" : "Сохранить время"}
      </button>
    </form>
  );
}
