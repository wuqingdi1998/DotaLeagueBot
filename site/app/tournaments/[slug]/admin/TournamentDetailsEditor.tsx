"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { tournamentTextFields } from "@/lib/tournament-form";
import { fromDateTimeInput, toDateTimeInput } from "../model/formatters";
import type { Tournament } from "../model/types";

type TournamentDetailsEditorProps = {
  tournament: Tournament;
  onSaved: () => Promise<void>;
  onMessage: (message: string) => void;
};

export function TournamentDetailsEditor({
  tournament,
  onSaved,
  onMessage,
}: TournamentDetailsEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(tournament);
  const [saving, setSaving] = useState(false);

  function setField(field: keyof Tournament, value: string | number) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);

    try {
      const response = await fetch("/api/tournament", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        slug?: string;
      };
      if (!response.ok) {
        onMessage(result.error ?? "Не удалось сохранить данные турнира");
        return;
      }

      onMessage("Изменения турнира сохранены в базе");
      if (result.slug && result.slug !== tournament.slug) {
        router.replace(`/tournaments/${result.slug}?manage=1`);
        return;
      }
      await onSaved();
    } catch {
      onMessage(
        "Не удалось связаться с сервером. Попробуйте сохранить ещё раз.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="tournament-editor" onSubmit={save}>
      <div className="editor-heading">
        <div>
          <p className="card-kicker">Редактор турнира</p>
          <h3>Основная информация</h3>
        </div>
        <button
          className="primary-button compact"
          type="submit"
          disabled={saving}
        >
          {saving ? "Сохраняем…" : "Сохранить изменения"}
        </button>
      </div>

      <div className="editor-grid">
        {tournamentTextFields.map(
          ({ field, label, placeholder, wide, multiline }) => (
            <label className={wide ? "wide-field" : ""} key={field}>
              <span>{label}</span>
              {multiline ? (
                <textarea
                  value={String(draft[field])}
                  placeholder={placeholder}
                  onChange={(event) => setField(field, event.target.value)}
                />
              ) : (
                <input
                  value={String(draft[field])}
                  placeholder={placeholder}
                  onChange={(event) => setField(field, event.target.value)}
                />
              )}
            </label>
          ),
        )}

        <label>
          <span>Начало турнира</span>
          <input
            type="datetime-local"
            value={toDateTimeInput(draft.start_at)}
            onChange={(event) =>
              setField("start_at", fromDateTimeInput(event.target.value))
            }
          />
        </label>
        <label>
          <span>Окончание турнира</span>
          <input
            type="datetime-local"
            value={toDateTimeInput(draft.end_at)}
            onChange={(event) =>
              setField("end_at", fromDateTimeInput(event.target.value))
            }
          />
        </label>
        <label>
          <span>Дедлайн регистрации</span>
          <input
            type="datetime-local"
            value={toDateTimeInput(draft.registration_deadline)}
            onChange={(event) =>
              setField(
                "registration_deadline",
                fromDateTimeInput(event.target.value),
              )
            }
          />
        </label>
        <label>
          <span>Количество игроков</span>
          <input
            type="number"
            min="1"
            max="10"
            value={draft.team_size}
            onChange={(event) =>
              setField("team_size", Number(event.target.value))
            }
          />
        </label>
        <label>
          <span>Количество команд</span>
          <input
            type="number"
            min="2"
            max="64"
            value={draft.max_teams}
            onChange={(event) =>
              setField("max_teams", Number(event.target.value))
            }
          />
        </label>
        <label>
          <span>Check-in, минут</span>
          <input
            type="number"
            min="5"
            max="180"
            value={draft.check_in_minutes}
            onChange={(event) =>
              setField("check_in_minutes", Number(event.target.value))
            }
          />
        </label>
        <label>
          <span>Формат плей-офф</span>
          <select
            value={draft.playoff_type}
            onChange={(event) => setField("playoff_type", event.target.value)}
          >
            <option value="single_elimination">Single Elimination</option>
            <option value="double_elimination">Double Elimination</option>
          </select>
        </label>
        <label>
          <span>Рабочий статус</span>
          <select
            value={draft.status}
            onChange={(event) => setField("status", event.target.value)}
          >
            <option value="draft">Черновик</option>
            <option value="registration">Регистрация открыта</option>
            <option value="active">Турнир идёт</option>
            <option value="finished">Завершён</option>
            <option value="archived">В архиве</option>
          </select>
        </label>
      </div>
    </form>
  );
}
