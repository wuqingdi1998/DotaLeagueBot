"use client";

import { Dispatch, SetStateAction } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import type { RuleDraft } from "./types";

export function RulesEditor({
  rules,
  setRules,
  newKey,
  moveRule,
}: {
  rules: RuleDraft[];
  setRules: Dispatch<SetStateAction<RuleDraft[]>>;
  newKey: (prefix: string) => string;
  moveRule: (index: number, direction: -1 | 1) => void;
}) {
  return (
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
            Дополнительных правил пока нет. Добавьте первый пункт кнопкой выше.
          </p>
        )}
      </div>
    </section>
  );
}
