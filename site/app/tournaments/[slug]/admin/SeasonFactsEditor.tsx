"use client";

import { useRef, useState } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiPlus,
  FiSave,
  FiTrash2,
} from "react-icons/fi";
import {
  maximumSeasonFactCount,
  minimumSeasonFactCount,
} from "@/lib/season-facts";
import type { TournamentSeasonFact } from "../model/types";

type SeasonFactDraft = {
  key: string;
  value: string;
  label: string;
};

type SeasonFactsEditorProps = {
  tournamentId: number;
  initialFacts: TournamentSeasonFact[];
  onSaved: () => Promise<void>;
};

export function SeasonFactsEditor({
  tournamentId,
  initialFacts,
  onSaved,
}: SeasonFactsEditorProps) {
  const nextKey = useRef(0);
  const [facts, setFacts] = useState<SeasonFactDraft[]>(() =>
    initialFacts.map((fact) => ({
      key: `season-fact-${fact.id}`,
      value: fact.value,
      label: fact.label,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function addFact() {
    if (facts.length >= maximumSeasonFactCount) return;
    nextKey.current += 1;
    setFacts((current) => [
      ...current,
      {
        key: `season-fact-new-${nextKey.current}`,
        value: "",
        label: "",
      },
    ]);
  }

  function updateFact(
    key: string,
    field: "value" | "label",
    value: string,
  ) {
    setFacts((current) =>
      current.map((fact) =>
        fact.key === key ? { ...fact, [field]: value } : fact,
      ),
    );
  }

  function moveFact(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= facts.length) return;
    setFacts((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeFact(key: string) {
    if (facts.length <= minimumSeasonFactCount) return;
    setFacts((current) => current.filter((fact) => fact.key !== key));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/season-facts", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          facts: facts.map(({ value, label }) => ({ value, label })),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Не удалось сохранить полоску");
        return;
      }
      setMessage("Информационная полоска сохранена");
      await onSaved();
    } catch {
      setMessage("Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="applications-panel season-facts-editor">
      <div className="editor-heading">
        <div>
          <p className="card-kicker">Сезонный формат</p>
          <h3>Информационная полоска</h3>
          <p>
            Эти сегменты показываются под афишей сезонного турнира. Можно
            оставить от 1 до 9 сегментов.
          </p>
        </div>
        <button
          className="primary-button compact tournament-save-button"
          type="button"
          disabled={saving}
          onClick={() => void save()}
        >
          <FiSave aria-hidden="true" />
          {saving ? "Сохраняем…" : "Сохранить полоску"}
        </button>
      </div>

      <div className="content-editor-subheading">
        <div>
          <span>Сегменты полоски</span>
          <small>{facts.length} из {maximumSeasonFactCount}</small>
        </div>
        <button
          type="button"
          disabled={facts.length >= maximumSeasonFactCount}
          onClick={addFact}
        >
          <FiPlus aria-hidden="true" /> Добавить сегмент
        </button>
      </div>

      <div className="season-facts-admin-list">
        {facts.map((fact, index) => (
          <div className="season-fact-admin-row" key={fact.key}>
            <strong>{index + 1}</strong>
            <label>
              <span>Значение</span>
              <input
                maxLength={40}
                value={fact.value}
                placeholder="Например: 14"
                onChange={(event) =>
                  updateFact(fact.key, "value", event.target.value)
                }
              />
            </label>
            <label>
              <span>Подпись</span>
              <input
                maxLength={120}
                value={fact.label}
                placeholder="Например: Всего туров в сезоне"
                onChange={(event) =>
                  updateFact(fact.key, "label", event.target.value)
                }
              />
            </label>
            <div className="season-fact-admin-actions">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveFact(index, -1)}
                aria-label={`Поднять сегмент ${index + 1}`}
                title="Поднять выше"
              >
                <FiArrowUp aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={index === facts.length - 1}
                onClick={() => moveFact(index, 1)}
                aria-label={`Опустить сегмент ${index + 1}`}
                title="Опустить ниже"
              >
                <FiArrowDown aria-hidden="true" />
              </button>
              <button
                className="danger"
                type="button"
                disabled={facts.length <= minimumSeasonFactCount}
                onClick={() => removeFact(fact.key)}
                aria-label={`Удалить сегмент ${index + 1}`}
                title={
                  facts.length <= minimumSeasonFactCount
                    ? "Нужно оставить минимум один сегмент"
                    : "Удалить"
                }
              >
                <FiTrash2 aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {message && (
        <p
          className={
            message.includes("сохранена") ? "form-success" : "field-error"
          }
        >
          {message}
        </p>
      )}
    </section>
  );
}
