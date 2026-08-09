"use client";

import { FormEvent, useState } from "react";
import { FiX } from "react-icons/fi";
import { tournamentTextFields } from "@/lib/tournament-form";
import type { TournamentStatus } from "@/lib/tournaments";
import {
  emptyTournament,
  statusDetails,
  toTournamentIso,
  type NewTournament,
} from "./tournament-hub-model";

export function TournamentForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (slug: string) => void;
}) {
  const [form, setForm] = useState<NewTournament>(emptyTournament);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof NewTournament>(
    field: K,
    value: NewTournament[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const registrationDeadline = new Date(
      toTournamentIso(form.registration_deadline),
    );
    const start = new Date(toTournamentIso(form.start_at));
    const end = new Date(toTournamentIso(form.end_at));
    if (
      !Number.isFinite(registrationDeadline.getTime()) ||
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      registrationDeadline > start ||
      start >= end
    ) {
      setError(
        "Дедлайн регистрации должен быть не позже начала, а окончание — позже начала турнира",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/tournament", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          start_at: toTournamentIso(form.start_at),
          end_at: toTournamentIso(form.end_at),
          registration_deadline: toTournamentIso(
            form.registration_deadline,
          ),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Не удалось создать турнир");
        return;
      }
      onCreated(form.slug);
    } catch {
      setError("Сервер недоступен. Проверьте соединение и попробуйте ещё раз");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal tournament-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-tournament-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" aria-label="Закрыть" onClick={onClose}>
          <FiX />
        </button>
        <p className="card-kicker">Панель организатора</p>
        <h2 id="create-tournament-title">Добавить турнир</h2>
        <p className="modal-intro">
          Создайте будущий, текущий или архивный турнир. После сохранения можно
          добавить команды, матчи и результаты.
        </p>
        <form className="tournament-editor" onSubmit={submit}>
          <div className="editor-grid">
            <label>
              <span>Тип турнира</span>
              <select
                value={form.tournament_type}
                onChange={(event) =>
                  setField(
                    "tournament_type",
                    event.target.value as NewTournament["tournament_type"],
                  )
                }
              >
                <option value="ordinary">Обычный турнир</option>
                <option value="seasonal">Сезонный турнир</option>
                <option value="seasonal_cup">Сезонный Кубок</option>
              </select>
            </label>
            {form.tournament_type === "seasonal" && (
              <NumberField
                label="Количество туров"
                min={1}
                max={100}
                value={form.season_round_count}
                onChange={(value) => setField("season_round_count", value)}
              />
            )}
            {tournamentTextFields
              .filter(
                ({ field }) =>
                  form.tournament_type !== "seasonal" ||
                  !["group_format", "playoff_format", "final_format"].includes(
                    field,
                  ),
              )
              .map(
              ({
                field,
                label,
                placeholder,
                wide,
                multiline,
                required = true,
              }) => (
                <label className={wide ? "wide-field" : ""} key={field}>
                  <span>{label}</span>
                  {multiline ? (
                    <textarea
                      required={required}
                      value={String(form[field])}
                      placeholder={placeholder}
                      onChange={(event) =>
                        setField(field, event.target.value as never)
                      }
                    />
                  ) : (
                    <input
                      required={required}
                      value={String(form[field])}
                      placeholder={placeholder}
                      onChange={(event) =>
                        setField(field, event.target.value as never)
                      }
                    />
                  )}
                </label>
              ),
            )}
            <DateField
              label="Начало"
              value={form.start_at}
              onChange={(value) => setField("start_at", value)}
            />
            <DateField
              label="Окончание"
              value={form.end_at}
              onChange={(value) => setField("end_at", value)}
            />
            <DateField
              label="Дедлайн регистрации"
              value={form.registration_deadline}
              onChange={(value) => setField("registration_deadline", value)}
            />
            {form.tournament_type !== "seasonal" && (
              <>
                <NumberField
                  label="Игроков в команде"
                  min={1}
                  max={10}
                  value={form.team_size}
                  onChange={(value) => setField("team_size", value)}
                />
                <NumberField
                  label="Максимум команд"
                  min={2}
                  max={64}
                  value={form.max_teams}
                  onChange={(value) => setField("max_teams", value)}
                />
                <NumberField
                  label="Check-in, минут"
                  min={5}
                  max={180}
                  value={form.check_in_minutes}
                  onChange={(value) => setField("check_in_minutes", value)}
                />
                <label>
                  <span>Формат плей-офф</span>
                  <select
                    value={form.playoff_type}
                    onChange={(event) =>
                      setField(
                        "playoff_type",
                        event.target.value as NewTournament["playoff_type"],
                      )
                    }
                  >
                    <option value="single_elimination">
                      Single Elimination
                    </option>
                    <option value="double_elimination">
                      Double Elimination
                    </option>
                  </select>
                </label>
              </>
            )}
            <label>
              <span>Статус</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setField("status", event.target.value as TournamentStatus)
                }
              >
                {Object.entries(statusDetails).map(([value, details]) => (
                  <option value={value} key={value}>
                    {details.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && <p className="field-error">{error}</p>}
          <div className="create-form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Отмена
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Сохраняем…" : "Создать турнир"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        required
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function NumberField({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        required
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
