"use client";

import { useEffect, useState } from "react";
import { fetchSiteRequest } from "@/lib/site-request";
import { profileBadgeDefinition, type ProfileBadgeKey } from "@/lib/profile-badges";

const refreshIntervalMs = 2_000;
export function useProfileBadges(initialBadgeKeys: readonly ProfileBadgeKey[], dotaId?: string) {
  const [latest, setLatest] = useState<{ dotaId: string; badgeKeys: ProfileBadgeKey[] } | null>(null);
  useEffect(() => {
    if (!dotaId) return;
    let stopped = false;
    let loading = false;
    const controller = new AbortController();
    async function refresh() {
      if (stopped || loading || document.hidden) return;
      loading = true;
      try {
        const response = await fetchSiteRequest(`/api/players/${encodeURIComponent(dotaId!)}/badges`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (response.ok && Array.isArray(result.badgeKeys) && !stopped) {
          const badgeKeys = result.badgeKeys.filter((key: unknown): key is ProfileBadgeKey => typeof key === "string" && profileBadgeDefinition(key) !== null);
          setLatest((current) => current && current.dotaId === dotaId && current.badgeKeys.join() === badgeKeys.join() ? current : { dotaId: dotaId!, badgeKeys });
        }
      } catch { /* Keep earned badges visible during a temporary connection failure. */ }
      finally { loading = false; }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), refreshIntervalMs);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      stopped = true;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [dotaId]);
  return latest && latest.dotaId === dotaId ? latest.badgeKeys : initialBadgeKeys;
}
