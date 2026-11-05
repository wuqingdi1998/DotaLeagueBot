"use client";

import { useState } from "react";
import { fetchSiteRequest } from "@/lib/site-request";
import { useTournament } from "../hooks/TournamentContext";

export function PostseasonRebuildButton() {
  const { data, loadData, setToast } = useTournament();
  const [saving, setSaving] = useState(false);
  if (!data || !data.groups.length) return null;
  const playoffs = data.matches.filter(match => ["upper", "lower", "grand_final"].includes(match.bracket_side ?? ""));
  const hasProtectedMatches = playoffs.some(match => match.team_a_application_id !== null || match.team_b_application_id !== null ||
    match.status !== "scheduled" || match.team_a_score !== null || match.team_b_score !== null ||
    match.team_a_result_label !== null || match.team_b_result_label !== null || match.decision_note !== null ||
    match.result_type !== "normal" || match.eliminated_team_application_id !== null);
  if (hasProtectedMatches) return null;
  async function rebuild() {
    setSaving(true);
    try {
      const response = await fetchSiteRequest("/api/admin/groups", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "rebuild_playoffs", tournamentId: data!.tournament.id }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setToast(result.error ?? "Не удалось обновить сетку"); return; }
      setToast("Сетка плей-офф обновлена по настройкам групп");
      await loadData();
    } finally { setSaving(false); }
  }
  return <button className="tournament-save-button" type="button" disabled={saving} onClick={rebuild}>
    {saving ? "Обновляем…" : "Обновить сетку по настройкам групп"}
  </button>;
}
