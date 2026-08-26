"use client";

import { useState } from "react";
import { FiEdit2, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import {
  calendarEventColors,
  calendarEventTitleMaxLength,
  parseSeasonCalendarEventInput,
  seasonCalendar,
  SeasonCalendarValidationError,
  type SeasonCalendarEvent,
  type SeasonCalendarEventInput,
} from "@/lib/season-calendar";

type CalendarEventEditorProps = {
  events: SeasonCalendarEvent[];
  onSave: (
    input: SeasonCalendarEventInput,
    existingId: number | null,
  ) => Promise<SeasonCalendarEvent>;
  onDelete: (id: number) => Promise<void>;
};

function eventDateLabel(date: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function CalendarEventEditor({
  events,
  onSave,
  onDelete,
}: CalendarEventEditorProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [date, setDate] = useState<string>(seasonCalendar.firstDate);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState<string>(calendarEventColors[0]);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function resetForm() {
    setEditingId(null);
    setDate(seasonCalendar.firstDate);
    setTitle("");
    setColor(calendarEventColors[0]);
  }

  function startEditing(event: SeasonCalendarEvent) {
    setEditingId(event.id);
    setDate(event.date);
    setTitle(event.title);
    setColor(event.color);
    setMessage("");
  }

  async function submitEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    try {
      const input = parseSeasonCalendarEventInput({ date, title, color });
      await onSave(input, editingId);
      setMessage(editingId ? "Событие обновлено" : "Событие добавлено");
      resetForm();
    } catch (reason) {
      setMessage(
        reason instanceof SeasonCalendarValidationError || reason instanceof Error
          ? reason.message
          : "Не удалось сохранить событие",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeEvent(event: SeasonCalendarEvent) {
    if (!window.confirm(`Удалить событие «${event.title}»?`)) return;
    setMessage("");
    try {
      await onDelete(event.id);
      if (editingId === event.id) resetForm();
      setMessage("Событие удалено");
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Не удалось удалить событие",
      );
    }
  }

  return (
    <aside className="calendar-editor" aria-labelledby="calendar-editor-title">
      <div className="calendar-editor-heading">
        <div>
          <p>Режим организатора</p>
          <h2 id="calendar-editor-title">Редактор событий</h2>
        </div>
        {editingId && (
          <button className="calendar-editor-cancel" type="button" onClick={resetForm}>
            <FiX aria-hidden="true" /> Отменить изменение
          </button>
        )}
      </div>

      <form className="calendar-event-form" onSubmit={submitEvent}>
        <label>
          <span>Дата</span>
          <input
            type="date"
            value={date}
            min={seasonCalendar.firstDate}
            max={seasonCalendar.lastDate}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </label>
        <label className="calendar-title-field">
          <span>Название ивента</span>
          <input
            type="text"
            value={title}
            maxLength={calendarEventTitleMaxLength}
            placeholder="Например: Старт регистрации"
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        <fieldset className="calendar-color-field">
          <legend>Цвет заливки</legend>
          <div className="calendar-color-options">
            {calendarEventColors.map((option) => (
              <button
                className={color === option ? "is-selected" : undefined}
                key={option}
                type="button"
                style={{ backgroundColor: option }}
                aria-label={`Выбрать цвет ${option}`}
                aria-pressed={color === option}
                onClick={() => setColor(option)}
              />
            ))}
            <label className="calendar-custom-color">
              <input
                type="color"
                value={color}
                aria-label="Выбрать другой цвет"
                onChange={(event) => setColor(event.target.value.toUpperCase())}
              />
              <span>Другой</span>
            </label>
          </div>
        </fieldset>
        <button className="calendar-save-button" type="submit" disabled={isSaving}>
          {editingId ? <FiEdit2 aria-hidden="true" /> : <FiPlus aria-hidden="true" />}
          {isSaving
            ? "Сохраняем…"
            : editingId
              ? "Сохранить изменения"
              : "Добавить событие"}
        </button>
      </form>

      {message && <p className="calendar-editor-message" role="status">{message}</p>}

      <div className="calendar-editor-events">
        <h3>Добавленные события</h3>
        {events.length ? (
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                <span
                  className="calendar-editor-event-color"
                  style={{ backgroundColor: event.color }}
                  aria-hidden="true"
                />
                <span className="calendar-editor-event-copy">
                  <strong>{event.title}</strong>
                  <small>{eventDateLabel(event.date)}</small>
                </span>
                <button
                  type="button"
                  onClick={() => startEditing(event)}
                  aria-label={`Изменить событие ${event.title}`}
                >
                  <FiEdit2 aria-hidden="true" />
                </button>
                <button
                  className="is-delete"
                  type="button"
                  onClick={() => void removeEvent(event)}
                  aria-label={`Удалить событие ${event.title}`}
                >
                  <FiTrash2 aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>Событий пока нет. Добавьте первое через форму выше.</p>
        )}
      </div>
    </aside>
  );
}
