"use client";

import { Dispatch, SetStateAction } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiCalendar,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import type {
  ScheduleDayDraft,
  ScheduleEntryDraft,
} from "./types";

type ScheduleEditorProps = {
  days: ScheduleDayDraft[];
  setDays: Dispatch<SetStateAction<ScheduleDayDraft[]>>;
  newKey: (prefix: string) => string;
  moveDay: (index: number, direction: -1 | 1) => void;
  moveEntry: (
    dayKey: string,
    entryIndex: number,
    direction: -1 | 1,
  ) => void;
};

export function ScheduleEditor({
  days,
  setDays,
  newKey,
  moveDay,
  moveEntry,
}: ScheduleEditorProps) {
  const updateDay = (dayKey: string, patch: Partial<ScheduleDayDraft>) => {
    setDays((current) =>
      current.map((day) => (day.key === dayKey ? { ...day, ...patch } : day)),
    );
  };
  const updateEntry = (
    dayKey: string,
    entryKey: string,
    patch: Partial<ScheduleEntryDraft>,
  ) => {
    setDays((current) =>
      current.map((day) =>
        day.key === dayKey
          ? {
              ...day,
              entries: day.entries.map((entry) =>
                entry.key === entryKey ? { ...entry, ...patch } : entry,
              ),
            }
          : day,
      ),
    );
  };

  return (
    <section className="schedule-admin-section">
      <div className="content-editor-subheading">
        <div>
          <span>Расписание турнира</span>
          <small>{days.length} дней</small>
        </div>
        <button
          type="button"
          onClick={() =>
            setDays((current) => [
              ...current,
              {
                key: newKey("schedule-day"),
                dayDate: "",
                title: `День ${current.length + 1}`,
                entries: [],
              },
            ])
          }
        >
          <FiPlus aria-hidden="true" /> Добавить день
        </button>
      </div>

      <div className="schedule-admin-days">
        {days.map((day, dayIndex) => (
          <section className="schedule-admin-day" key={day.key}>
            <div className="schedule-admin-day-head">
              <div className="schedule-day-number">
                <FiCalendar aria-hidden="true" />
                <strong>День {dayIndex + 1}</strong>
              </div>
              <label>
                <span>Дата</span>
                <input
                  required
                  type="date"
                  value={day.dayDate}
                  onChange={(event) =>
                    updateDay(day.key, { dayDate: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Название дня</span>
                <input
                  maxLength={100}
                  value={day.title}
                  onChange={(event) =>
                    updateDay(day.key, { title: event.target.value })
                  }
                  placeholder={`День ${dayIndex + 1}`}
                />
              </label>
              <div className="schedule-admin-actions">
                <button
                  type="button"
                  disabled={dayIndex === 0}
                  onClick={() => moveDay(dayIndex, -1)}
                  aria-label={`Поднять день ${dayIndex + 1}`}
                >
                  <FiArrowUp aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={dayIndex === days.length - 1}
                  onClick={() => moveDay(dayIndex, 1)}
                  aria-label={`Опустить день ${dayIndex + 1}`}
                >
                  <FiArrowDown aria-hidden="true" />
                </button>
                <button
                  className="danger"
                  type="button"
                  onClick={() =>
                    setDays((current) =>
                      current.filter((item) => item.key !== day.key),
                    )
                  }
                  aria-label={`Удалить день ${dayIndex + 1}`}
                >
                  <FiTrash2 aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="schedule-admin-entry-list">
              {day.entries.map((entry, entryIndex) => (
                <div className="schedule-admin-entry" key={entry.key}>
                  <label>
                    <span>Время</span>
                    <input
                      required
                      type="time"
                      value={entry.startTime}
                      onChange={(event) =>
                        updateEntry(day.key, entry.key, {
                          startTime: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="schedule-stage-field">
                    <span>Название этапа</span>
                    <input
                      required
                      maxLength={160}
                      value={entry.stageName}
                      onChange={(event) =>
                        updateEntry(day.key, entry.key, {
                          stageName: event.target.value,
                        })
                      }
                      placeholder="Например: Групповой этап · Раунд 1"
                    />
                  </label>
                  <label>
                    <span>Матчей</span>
                    <input
                      required
                      type="number"
                      min={1}
                      max={64}
                      value={entry.matchCount}
                      onChange={(event) =>
                        updateEntry(day.key, entry.key, {
                          matchCount: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Формат</span>
                    <input
                      required
                      maxLength={40}
                      value={entry.seriesFormat}
                      onChange={(event) =>
                        updateEntry(day.key, entry.key, {
                          seriesFormat: event.target.value,
                        })
                      }
                      placeholder="BO1"
                    />
                  </label>
                  <div className="schedule-admin-actions">
                    <button
                      type="button"
                      disabled={entryIndex === 0}
                      onClick={() => moveEntry(day.key, entryIndex, -1)}
                      aria-label={`Поднять строку ${entryIndex + 1}`}
                    >
                      <FiArrowUp aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={entryIndex === day.entries.length - 1}
                      onClick={() => moveEntry(day.key, entryIndex, 1)}
                      aria-label={`Опустить строку ${entryIndex + 1}`}
                    >
                      <FiArrowDown aria-hidden="true" />
                    </button>
                    <button
                      className="danger"
                      type="button"
                      onClick={() =>
                        updateDay(day.key, {
                          entries: day.entries.filter(
                            (row) => row.key !== entry.key,
                          ),
                        })
                      }
                      aria-label={`Удалить строку ${entryIndex + 1}`}
                    >
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="schedule-add-entry"
              type="button"
              onClick={() =>
                updateDay(day.key, {
                  entries: [
                    ...day.entries,
                    {
                      key: newKey("schedule-entry"),
                      startTime: "",
                      stageName: "",
                      matchCount: 1,
                      seriesFormat: "BO1",
                    },
                  ],
                })
              }
            >
              <FiPlus aria-hidden="true" /> Добавить строку расписания
            </button>
          </section>
        ))}
        {!days.length && (
          <p className="empty-admin-list">
            Расписание пока не заполнено. Добавьте первый день кнопкой выше.
          </p>
        )}
      </div>
    </section>
  );
}
