"use client";

import { FormEvent, useState } from "react";
import type { Tournament, TournamentGroup } from "../model/types";

type GroupSettingsEditorProps = {
  group: TournamentGroup;
  playoffType: Tournament["playoff_type"];
  onSaved: () => Promise<void>;
  onMessage: (message: string) => void;
};

export function GroupSettingsEditor({
  group,
  playoffType,
  onSaved,
  onMessage,
}: GroupSettingsEditorProps) {
  const [teamCapacity, setTeamCapacity] = useState(group.team_capacity);
  const [advanceToPlayoff, setAdvanceToPlayoff] = useState(
    group.advance_to_playoff,
  );
  const [advanceToUpper, setAdvanceToUpper] = useState(group.advance_to_upper);
  const [advanceToLower, setAdvanceToLower] = useState(group.advance_to_lower);
  const [explanation, setExplanation] = useState(group.explanation ?? "");
  const [saving, setSaving] = useState(false);
  const advancing =
    playoffType === "double_elimination"
      ? advanceToUpper + advanceToLower
      : advanceToPlayoff;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/admin/groups", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        groupId: group.id,
        teamCapacity,
        advanceToPlayoff,
        advanceToUpper,
        advanceToLower,
        explanation,
      }),
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      onMessage(result.error ?? "Не удалось сохранить настройки группы");
      return;
    }
    onMessage(`Настройки ${group.name} сохранены`);
    await onSaved();
  }

  return (
    <form className="group-settings-editor" onSubmit={save}>
      <div className="group-settings-heading">
        <div>
          <strong>Настройки {group.name}</strong>
          <span>
            {playoffType === "double_elimination"
              ? "Double Elimination"
              : "Single Elimination"}
          </span>
        </div>
      </div>
      <div className="group-settings-grid">
        <label>
          <span>Команд в группе</span>
          <input
            type="number"
            min="3"
            max="8"
            value={teamCapacity}
            onChange={(event) => setTeamCapacity(Number(event.target.value))}
          />
        </label>
        {playoffType === "double_elimination" ? (
          <>
            <label>
              <span>Выходят в верхнюю сетку</span>
              <input
                type="number"
                min="0"
                max={teamCapacity}
                value={advanceToUpper}
                onChange={(event) =>
                  setAdvanceToUpper(Number(event.target.value))
                }
              />
            </label>
            <label>
              <span>Выходят в нижнюю сетку</span>
              <input
                type="number"
                min="0"
                max={teamCapacity}
                value={advanceToLower}
                onChange={(event) =>
                  setAdvanceToLower(Number(event.target.value))
                }
              />
            </label>
          </>
        ) : (
          <label>
            <span>Выходят в плей-офф</span>
            <input
              type="number"
              min="1"
              max={teamCapacity}
              value={advanceToPlayoff}
              onChange={(event) =>
                setAdvanceToPlayoff(Number(event.target.value))
              }
            />
          </label>
        )}
        {playoffType === "double_elimination" && (
          <label>
            <span>Всего выходят в плей-офф</span>
            <input readOnly value={advancing} />
          </label>
        )}
        <label>
          <span>Вылетают при полной группе</span>
          <input readOnly value={Math.max(0, teamCapacity - advancing)} />
        </label>
        <label className="group-explanation-field">
          <span>Пояснение под группой</span>
          <textarea
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
            placeholder="Например: итоговое распределение установлено после переигровки согласно правилам"
          />
        </label>
      </div>
      <div className="group-settings-actions">
        {explanation && (
          <button
            className="text-action"
            type="button"
            onClick={() => setExplanation("")}
          >
            Удалить пояснение
          </button>
        )}
        <button type="submit" disabled={saving}>
          {saving ? "Сохраняем…" : "Сохранить группу"}
        </button>
      </div>
    </form>
  );
}
