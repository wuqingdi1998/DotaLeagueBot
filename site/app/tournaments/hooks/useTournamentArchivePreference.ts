"use client";

import { useCallback, useState } from "react";
import { fetchSiteRequest } from "@/lib/site-request";

type TournamentArchivePreferenceOptions = {
  playerId: string | null;
  savedShouldHideArchivedTournaments: boolean;
  isLoading: boolean;
};

type PendingTournamentArchivePreference = {
  playerId: string | null;
  savedValue: boolean;
  nextValue: boolean;
};

export function useTournamentArchivePreference({
  playerId,
  savedShouldHideArchivedTournaments,
  isLoading,
}: TournamentArchivePreferenceOptions) {
  const [pendingPreference, setPendingPreference] =
    useState<PendingTournamentArchivePreference | null>(null);
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const savedValue = playerId ? savedShouldHideArchivedTournaments : false;
  const shouldUsePendingPreference =
    pendingPreference?.playerId === playerId &&
    pendingPreference.savedValue === savedValue;
  const shouldHideArchivedTournaments = shouldUsePendingPreference
    ? pendingPreference.nextValue
    : savedValue;

  const changeShouldHideArchivedTournaments = useCallback(
    async (nextValue: boolean) => {
      setPendingPreference({ playerId, savedValue, nextValue });
      if (!playerId) return;

      setIsSavingPreference(true);
      try {
        const response = await fetchSiteRequest(
          "/api/tournament-directory-preferences",
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              shouldHideArchivedTournaments: nextValue,
            }),
          },
        );
        const result = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(
            result.error ?? "Не удалось сохранить настройку турниров",
          );
        }
      } catch (error) {
        setPendingPreference(null);
        throw error;
      } finally {
        setIsSavingPreference(false);
      }
    },
    [playerId, savedValue],
  );

  return {
    shouldHideArchivedTournaments,
    isSavingPreference,
    isPreferenceReady: !isLoading,
    changeShouldHideArchivedTournaments,
  };
}
