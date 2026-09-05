"use client";

import { fetchSiteRequest } from "@/lib/site-request";

import { FormEvent, useRef, useState } from "react";
import { FiSave } from "react-icons/fi";
import { PrizesEditor } from "./admin/content-editor/PrizesEditor";
import { RulesEditor } from "./admin/content-editor/RulesEditor";
import { ScheduleEditor } from "./admin/content-editor/ScheduleEditor";
import type {
  Application,
  Prize,
  PrizeDraft,
  Rule,
  RuleDraft,
  ScheduleDay,
  ScheduleDayDraft,
} from "./admin/content-editor/types";

type TournamentContentEditorProps = {
  tournamentId: number;
  initialScheduleDays: ScheduleDay[];
  initialRules: Rule[];
  initialPrizes: Prize[];
  applications: Application[];
  onSaved: () => Promise<void>;
};

export function TournamentContentEditor({
  tournamentId,
  initialScheduleDays,
  initialRules,
  initialPrizes,
  applications,
  onSaved,
}: TournamentContentEditorProps) {
  const nextKey = useRef(0);
  const [scheduleDays, setScheduleDays] = useState<ScheduleDayDraft[]>(() =>
    initialScheduleDays.map((day) => ({
      key: `schedule-day-${day.id}`,
      dayDate: day.day_date,
      title: day.title ?? "",
      entries: day.entries.map((entry) => ({
        key: `schedule-entry-${entry.id}`,
        startTime: entry.start_time,
        stageName: entry.stage_name,
        matchCount: entry.match_count,
        seriesFormat: entry.series_format,
      })),
    })),
  );
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
      teamName: prize.team_name ?? "",
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
    setRules((current) => moveItem(current, index, direction));
  }

  function moveScheduleDay(index: number, direction: -1 | 1) {
    setScheduleDays((current) => moveItem(current, index, direction));
  }

  function moveScheduleEntry(
    dayKey: string,
    entryIndex: number,
    direction: -1 | 1,
  ) {
    setScheduleDays((current) =>
      current.map((day) =>
        day.key === dayKey
          ? {
              ...day,
              entries: moveItem(day.entries, entryIndex, direction),
            }
          : day,
      ),
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage("");

    try {
      const response = await fetchSiteRequest("/api/admin/tournament-content", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          scheduleDays: scheduleDays.map((day) => ({
            dayDate: day.dayDate,
            title: day.title,
            entries: day.entries.map((entry) => ({
              startTime: entry.startTime,
              stageName: entry.stageName,
              matchCount: entry.matchCount,
              seriesFormat: entry.seriesFormat,
            })),
          })),
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
      setMessage(
        "Расписание, дополнительные правила и призовые места сохранены",
      );
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
          <h3>Расписание, правила и призовые места</h3>
          <p>
            Дни, строки расписания и пункты правил можно добавлять, удалять и
            менять местами.
          </p>
        </div>
        <button
          className="tournament-save-button"
          type="submit"
          disabled={saving}
        >
          <FiSave aria-hidden="true" />
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>

      <ScheduleEditor
        days={scheduleDays}
        setDays={setScheduleDays}
        newKey={newKey}
        moveDay={moveScheduleDay}
        moveEntry={moveScheduleEntry}
      />
      <RulesEditor
        rules={rules}
        setRules={setRules}
        newKey={newKey}
        moveRule={moveRule}
      />
      <PrizesEditor
        prizes={prizes}
        setPrizes={setPrizes}
        applications={applications}
        newKey={newKey}
      />

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

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
