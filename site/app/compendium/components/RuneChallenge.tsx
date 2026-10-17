"use client";

import { fetchSiteRequest } from "@/lib/site-request";
import { useState, type ReactNode } from "react";
import type { RuneChallengeData } from "../model/types";
import { useCompendiumToast } from "../hooks/useCompendiumToast";
import { RuneChallengeView } from "./RuneChallengeView";

export function RuneChallenge({
  initialChallenge,
  currentTimeMs,
  rewardStars,
  rewardStarsLabel,
  resetCountdown,
  onStarsChange,
  onCompleted,
  isPreview = false,
  showPreviewContent = false,
  overlay,
}: {
  initialChallenge: RuneChallengeData;
  currentTimeMs: number;
  rewardStars: number;
  rewardStarsLabel?: string;
  resetCountdown: string;
  onStarsChange: (totalStars: number, communityStars: number) => void;
  onCompleted?: () => void;
  isPreview?: boolean;
  showPreviewContent?: boolean;
  overlay?: ReactNode;
}) {
  const [challenge, setChallenge] = useState(initialChallenge);
  const [selectedHeroId, setSelectedHeroId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useCompendiumToast();
  async function saveHero() {
    if (!selectedHeroId || isSaving) return;
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetchSiteRequest("/api/compendium/rune-challenge/selection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ heroId: Number(selectedHeroId) }),
      });
      const result = (await response.json()) as {
        error?: string;
        code?: string;
        runeChallenge?: RuneChallengeData;
      };
      if (!response.ok || !result.runeChallenge) {
        if (result.code === "RUNE_ACCESS_REQUIRED") {
          setChallenge({
            hasAccess: false,
            accessRoleName: null,
            selection: null,
            completion: null,
          });
        }
        throw new Error(result.error ?? "Не удалось сохранить любимого героя");
      }
      setChallenge(result.runeChallenge);
      setSelectedHeroId("");
      setMessage("Любимый герой выбран. Следующая смена будет доступна через 7 дней.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить героя");
    } finally {
      setIsSaving(false);
    }
  }

  async function checkWin() {
    if (isChecking) return;
    setIsChecking(true);
    setMessage("");
    try {
      const response = await fetchSiteRequest("/api/compendium/rune-challenge/check", {
        method: "POST",
      });
      const result = (await response.json()) as {
        error?: string;
        code?: string;
        runeChallenge?: RuneChallengeData;
        totalStars?: number;
        communityStars?: number;
      };
      if (!response.ok || !result.runeChallenge) {
        if (result.code === "RUNE_ACCESS_REQUIRED") {
          setChallenge({
            hasAccess: false,
            accessRoleName: null,
            selection: null,
            completion: null,
          });
        }
        throw new Error(result.error ?? "Не удалось проверить испытание");
      }
      setChallenge(result.runeChallenge);
      if (
        typeof result.totalStars === "number" &&
        typeof result.communityStars === "number"
      ) {
        onStarsChange(result.totalStars, result.communityStars);
      }
      setMessage(
        `Испытание выполнено. Вы получили ${rewardStars} ${rewardStars === 1 ? "звезду" : "звезды"}!`,
      );
      if (result.runeChallenge.completion) onCompleted?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось проверить испытание");
    } finally {
      setIsChecking(false);
    }
  }

  return <RuneChallengeView challenge={challenge} currentTimeMs={currentTimeMs} rewardStars={rewardStars} rewardStarsLabel={rewardStarsLabel}
    resetCountdown={resetCountdown} isPreview={isPreview} showPreviewContent={showPreviewContent} overlay={overlay}
    selectedHeroId={selectedHeroId} isSaving={isSaving} isChecking={isChecking} message={message}
    setSelectedHeroId={setSelectedHeroId} saveHero={() => void saveHero()} checkWin={() => void checkWin()} />;
}
