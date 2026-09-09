"use client";

import { useState } from "react";
import { fetchSiteRequest } from "@/lib/site-request";

type TournamentHeroVisibilityOptions = {
  initialIsCollapsed: boolean;
  playerId: string | null;
  tournamentId: number | null;
  onSaveError: (message: string) => void;
};

export function useTournamentHeroVisibility({
  initialIsCollapsed,
  playerId,
  tournamentId,
  onSaveError,
}: TournamentHeroVisibilityOptions) {
  const scopeKey = `${tournamentId ?? "none"}:${playerId ?? "guest"}`;
  const [localPreference, setLocalPreference] = useState<{
    isCollapsed: boolean;
    scopeKey: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isCollapsed =
    localPreference?.scopeKey === scopeKey
      ? localPreference.isCollapsed
      : initialIsCollapsed;

  async function toggleHeroVisibility() {
    if (isSaving) return;
    const nextIsCollapsed = !isCollapsed;
    setLocalPreference({ isCollapsed: nextIsCollapsed, scopeKey });

    if (!playerId || !tournamentId) return;

    setIsSaving(true);
    try {
      const response = await fetchSiteRequest(
        "/api/tournament-hero-preferences",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            isCollapsed: nextIsCollapsed,
            tournamentId,
          }),
        },
      );
      if (!response.ok) {
        setLocalPreference({ isCollapsed, scopeKey });
        onSaveError("Не удалось сохранить положение шапки");
      }
    } catch {
      setLocalPreference({ isCollapsed, scopeKey });
      onSaveError("Не удалось сохранить положение шапки");
    } finally {
      setIsSaving(false);
    }
  }

  return { isCollapsed, isSaving, toggleHeroVisibility };
}
