"use client";

import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { OCTOBER_COMPENDIUM_END_AT } from "@/lib/october-compendium-schedule";
import { OCTOBER_CLAN_PUBLICATION_AT } from "@/lib/october-compendium-release";
import { OCTOBER_CLANS } from "@/lib/october-clans";
import type { OctoberClanBadgeDirectory } from "@/lib/october-clan-badge-directory";

type OctoberClanBadgeContextValue = {
  clansByDotaId: OctoberClanBadgeDirectory;
  isActive: boolean;
};

export const OctoberClanBadgeContext = createContext<OctoberClanBadgeContextValue>({
  clansByDotaId: {},
  isActive: false,
});

const badgeStartTime = Date.parse(OCTOBER_CLAN_PUBLICATION_AT);
const badgeEndTime = Date.parse(OCTOBER_COMPENDIUM_END_AT);

function isBadgeWindow(time: number) {
  return time >= badgeStartTime && time < badgeEndTime;
}

function isClanDirectory(value: unknown): value is OctoberClanBadgeDirectory {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const clanIds = new Set<string>(OCTOBER_CLANS.map((clan) => clan.id));
  return Object.entries(value).every(([dotaId, clanId]) =>
    /^[1-9]\d*$/.test(dotaId) && typeof clanId === "string" && clanIds.has(clanId)
  );
}

export function OctoberClanBadgesProvider({ children }: { children: ReactNode }) {
  const [clansByDotaId, setClansByDotaId] = useState<OctoberClanBadgeDirectory>({});
  const [isActive, setIsActive] = useState(() => isBadgeWindow(Date.now()));

  useEffect(() => {
    const controller = new AbortController();
    let startTimer: ReturnType<typeof setTimeout> | undefined;
    let endTimer: ReturnType<typeof setTimeout> | undefined;

    async function loadBadges() {
      setIsActive(true);
      try {
        const response = await fetch("/api/compendium/october/clan-badges", {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (isClanDirectory(data)) setClansByDotaId(data);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setClansByDotaId({});
        }
      }
    }

    const now = Date.now();
    if (isBadgeWindow(now)) {
      void loadBadges();
    } else if (now < badgeStartTime) {
      startTimer = setTimeout(() => void loadBadges(), badgeStartTime - now);
    }
    if (now < badgeEndTime) {
      endTimer = setTimeout(() => {
        setIsActive(false);
        setClansByDotaId({});
      }, badgeEndTime - now);
    }

    return () => {
      controller.abort();
      if (startTimer) clearTimeout(startTimer);
      if (endTimer) clearTimeout(endTimer);
    };
  }, []);

  const value = useMemo(
    () => ({ clansByDotaId, isActive }),
    [clansByDotaId, isActive],
  );
  return (
    <OctoberClanBadgeContext.Provider value={value}>
      {children}
    </OctoberClanBadgeContext.Provider>
  );
}
