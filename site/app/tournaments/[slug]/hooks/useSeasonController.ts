"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { TournamentTab } from "../model/types";
import type { SeasonData } from "../model/season-types";

export type SeasonPlayerOption = {
  discord_id: string;
  ingame_name: string;
  positions: string | null;
  avatar_url: string | null;
};

export function useSeasonController({
  enabled,
  isOrganizer,
  setActiveTab,
  setMessage,
  slug,
}: {
  enabled: boolean;
  isOrganizer: boolean;
  setActiveTab: (tab: TournamentTab) => void;
  setMessage: (message: string) => void;
  slug: string;
}) {
  const searchParams = useSearchParams();
  const requestedRound = Number(searchParams.get("round") || 0);
  const [data, setData] = useState<SeasonData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeRoundNumber, setActiveRoundNumber] = useState<number | null>(
    Number.isInteger(requestedRound) && requestedRound > 0
      ? requestedRound
      : null,
  );
  const [players, setPlayers] = useState<SeasonPlayerOption[]>([]);
  const [playerSearch, setPlayerSearch] = useState("");

  const load = useCallback(async () => {
    if (!enabled) {
      setData(null);
      setError("");
      return;
    }
    setLoading(true);
    try {
      const roundQuery =
        activeRoundNumber !== null ? `&round=${activeRoundNumber}` : "";
      const response = await fetch(
        `/api/season?slug=${encodeURIComponent(slug)}${roundQuery}`,
        { cache: "no-store" },
      );
      const result = (await response.json()) as SeasonData & { error?: string };
      if (!response.ok) {
        setData(null);
        setError(result.error ?? "Не удалось загрузить сезон");
        return;
      }
      setData(result);
      setError("");
    } catch {
      setError("Не удалось связаться с сервером");
    } finally {
      setLoading(false);
    }
  }, [activeRoundNumber, enabled, slug]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (enabled && requestedRound > 0 && Number.isInteger(requestedRound)) {
      setActiveTab("round");
    }
  }, [enabled, requestedRound, setActiveTab]);

  useEffect(() => {
    if (!enabled || !isOrganizer) return;
    const timer = window.setTimeout(async () => {
      const response = await fetch(
        `/api/players?q=${encodeURIComponent(playerSearch)}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const result = (await response.json()) as {
        players: SeasonPlayerOption[];
      };
      setPlayers(result.players);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [enabled, isOrganizer, playerSearch]);

  function replaceRoundQuery(roundNumber: number | null) {
    const url = new URL(window.location.href);
    if (roundNumber === null) url.searchParams.delete("round");
    else url.searchParams.set("round", String(roundNumber));
    window.history.replaceState({}, "", url);
  }

  function openRound(roundNumber: number, matchId?: number) {
    setActiveRoundNumber(roundNumber);
    setActiveTab("round");
    replaceRoundQuery(roundNumber);
    window.requestAnimationFrame(() => {
      const targetId = matchId ? `season-match-${matchId}` : "tournament";
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function openTab(
    tab: Extract<
      TournamentTab,
      "overview" | "standings" | "rounds" | "admin"
    >,
  ) {
    setActiveRoundNumber(null);
    setActiveTab(tab);
    replaceRoundQuery(null);
  }

  async function mutate(
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, unknown>,
  ) {
    const response = await fetch("/api/admin/season", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as {
      error?: string;
      requiresConfirmation?: boolean;
      id?: number;
    };
    if (!response.ok) {
      setMessage(result.error ?? "Не удалось сохранить изменения");
      return { ok: false, ...result };
    }
    if (!result.requiresConfirmation) {
      setMessage("Изменения сезонного турнира сохранены");
      await load();
    }
    return { ok: true, ...result };
  }

  return {
    activeRoundNumber,
    data,
    error,
    load,
    loading,
    mutate,
    openRound,
    openTab,
    playerSearch,
    players: enabled && isOrganizer ? players : [],
    setPlayerSearch,
    setActiveRoundNumber,
  };
}
