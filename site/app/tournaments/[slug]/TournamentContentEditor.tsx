"use client";

import { FormEvent, useRef, useState } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiPlus,
  FiSave,
  FiTrash2,
} from "react-icons/fi";

type Rule = {
  id: number;
  rule_text: string;
};

type Prize = {
  id: number;
  placement: number;
  application_id: number | null;
  team_name: string;
  prize_text: string | null;
};

type Application = {
  id: number;
  team_name: string;
};

type RuleDraft = {
  key: string;
  text: string;
};

type PrizeDraft = {
  key: string;
  placement: number;
  applicationId: number | null;
  teamName: string;
  prizeText: string;
};

export function TournamentContentEditor({
  tournamentId,
  initialRules,
  initialPrizes,
  applications,
  onSaved,
}: {
  tournamentId: number;
  initialRules: Rule[];
  initialPrizes: Prize[];
  applications: Application[];
  onSaved: () => Promise<void>;
}) {
  const nextKey = useRef(0);
  const [rules, setRules] = useState<RuleDraft[]>(() =>
    initialRules.map((rule) => ({
      key: `rule-${rule.id}`,
      text: rule.rule_text,
    })),
  );
  const [prizes, setPrizes] = useState<PrizeDraft[]>(() =>
    initialPrizes.map((prize) => ({
      key: `prize-${prize.id}`,
      placement: prize.placement,
      applicationId: prize.application_id,
      teamName: prize.team_name,
      prizeText: prize.prize_text ?? "",
    })),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function newKey(prefix: string) {
    nextKey.current += 1;
    return `${prefix}-new-${nextKey.current}`;
  }

  function moveRule(index: number, direction: -1 | 1) {
    setRules((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/tournament-content", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          rules: rules.map((rule) => rule.text),
          prizes: prizes.map((prize) => ({
            placement: prize.placement,
            applicationId: prize.applicationId,
            teamName: prize.teamName,
            prizeText: prize.prizeText,
          })),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Не удалось сохранить данные турнира");
        return;
      }
      setMessage("Дополнительные правила и призовые места сохранены");
      await onSaved();
    } catch {
      setMessage("Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="applications-panel tournament-content-editor"
      onSubmit={save}
    >
      <div className="editor-heading">
        <div>
          <p className="card-kicker">Содержание турнира</p>
          <h3>Правила и призовые места</h3>
          <p>
            Каждый пункт правил редактируется отдельно. Строки можно менять
            местами, добавлять и удалять.
          </p>
        </div>
        <button type="submit" disabled={saving}>
          <FiSave aria-hidden="true" />
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>

      <section className="rule-admin-section">
        <div className="content-editor-subheading">
          <div>
            <span>Дополнительные правила</span>
            <small>{rules.length} пунктов</small>
          </div>
          <button
            type="button"
            onClick={() =>
              setRules((current) => [
                ...current,
                { key: newKey("rule"), text: "" },
              ])
            }
          >
            <FiPlus aria-hidden="true" /> Добавить пункт
          </button>
        </div>
        <div className="rule-admin-list">
          {rules.map((rule, index) => (
            <div className="rule-admin-row" key={rule.key}>
              <strong>{index + 1}</strong>
              <textarea
                rows={3}
                value={rule.text}
                onChange={(event) =>
                  setRules((current) =>
                    current.map((item) =>
                      item.key === rule.key
                        ? { ...item, text: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder="Введите один пункт дополнительных правил"
              />
              <div>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveRule(index, -1)}
                  aria-label={`Поднять пункт ${index + 1}`}
                  title="Поднять выше"
                >
                  <FiArrowUp aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={index === rules.length - 1}
                  onClick={() => moveRule(index, 1)}
                  aria-label={`Опустить пункт ${index + 1}`}
                  title="Опустить ниже"
                >
                  <FiArrowDown aria-hidden="true" />
                </button>
                <button
                  className="danger"
                  type="button"
                  onClick={() =>
                    setRules((current) =>
                      current.filter((item) => item.key !== rule.key),
                    )
                  }
                  aria-label={`Удалить пункт ${index + 1}`}
                  title="Удалить"
                >
                  <FiTrash2 aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
          {!rules.length && (
            <p className="empty-admin-list">
              Дополнительных правил пока нет. Добавьте первый пункт кнопкой
              выше.
            </p>
          )}
        </div>
      </section>

      <section className="prize-admin-section">
        <div className="content-editor-subheading">
          <div>
            <span>Призовые места</span>
            <small>{prizes.length} мест</small>
          </div>
          <button
            type="button"
            onClick={() =>
              setPrizes((current) => [
                ...current,
                {
                  key: newKey("prize"),
                  placement:
                    Math.max(0, ...current.map((prize) => prize.placement)) + 1,
                  applicationId: null,
                  teamName: "",
                  prizeText: "",
                },
              ])
            }
          >
            <FiPlus aria-hidden="true" /> Добавить место
          </button>
        </div>
        <div className="prize-admin-list">
          {prizes.map((prize) => (
            <div className="prize-admin-row" key={prize.key}>
              <label>
                <span>Место</span>
                <input
                  type="number"
                  min="1"
                  max="64"
                  value={prize.placement}
                  onChange={(event) =>
                    setPrizes((current) =>
                      current.map((item) =>
                        item.key === prize.key
                          ? { ...item, placement: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <label>
                <span>Команда</span>
                <select
                  value={prize.applicationId ?? ""}
                  onChange={(event) => {
                    const applicationId = Number(event.target.value);
                    const team = applications.find(
                      (application) => application.id === applicationId,
                    );
                    setPrizes((current) =>
                      current.map((item) =>
                        item.key === prize.key
                          ? {
                              ...item,
                              applicationId: applicationId || null,
                              teamName: team?.team_name ?? "",
                            }
                          : item,
                      ),
                    );
                  }}
                >
                  <option value="">Выберите команду</option>
                  {applications.map((application) => (
                    <option value={application.id} key={application.id}>
                      {application.team_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="prize-reward-field">
                <span>Награда</span>
                <textarea
                  rows={2}
                  value={prize.prizeText}
                  onChange={(event) =>
                    setPrizes((current) =>
                      current.map((item) =>
                        item.key === prize.key
                          ? { ...item, prizeText: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Например: 4 000 ₽ или подробное описание награды"
                />
              </label>
              <button
                className="danger prize-delete-button"
                type="button"
                onClick={() =>
                  setPrizes((current) =>
                    current.filter((item) => item.key !== prize.key),
                  )
                }
              >
                <FiTrash2 aria-hidden="true" /> Удалить
              </button>
            </div>
          ))}
        </div>
      </section>

      {message && (
        <p
          className={
            message.includes("сохранены") ? "form-success" : "field-error"
          }
        >
          {message}
        </p>
      )}
    </form>
  );
}
