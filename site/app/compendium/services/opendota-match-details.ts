import { CompendiumError } from "../model/errors";
import { openDotaApiUrl } from "./opendota-client";

export type OpenDotaCosmetic = {
  itemId: number;
  itemName: string;
  itemRarity: string | null;
  itemTypeName: string | null;
};

export type OpenDotaParsedMatch = {
  matchId: string;
  hasParsed: boolean;
  players: Array<{
    accountId: string | null;
    playerSlot: number;
    heroId: number;
    cosmetics: OpenDotaCosmetic[];
  }>;
};

function openDotaUnavailable(): CompendiumError {
  return new CompendiumError(
    "OPEN_DOTA_UNAVAILABLE",
    "OpenDota временно недоступен. Попробуйте повторить проверку позже.",
  );
}

function parseCosmetics(value: unknown): OpenDotaCosmetic[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const cosmetic = entry as Record<string, unknown>;
    if (typeof cosmetic.item_id !== "number") return [];
    return [{
      itemId: cosmetic.item_id,
      itemName: typeof cosmetic.item_name === "string"
        ? cosmetic.item_name
        : "",
      itemRarity: typeof cosmetic.item_rarity === "string"
        ? cosmetic.item_rarity
        : null,
      itemTypeName: typeof cosmetic.item_type_name === "string"
        ? cosmetic.item_type_name
        : null,
    }];
  });
}

function parseMatchDetails(value: unknown): OpenDotaParsedMatch {
  if (!value || typeof value !== "object") throw openDotaUnavailable();
  const payload = value as Record<string, unknown>;
  if (
    (typeof payload.match_id !== "number" &&
      typeof payload.match_id !== "string") ||
    !Array.isArray(payload.players)
  ) {
    throw openDotaUnavailable();
  }
  const players = payload.players.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const player = entry as Record<string, unknown>;
    if (typeof player.player_slot !== "number" || typeof player.hero_id !== "number") {
      return [];
    }
    return [{
      accountId:
        typeof player.account_id === "number" || typeof player.account_id === "string"
          ? String(player.account_id)
          : null,
      playerSlot: player.player_slot,
      heroId: player.hero_id,
      cosmetics: parseCosmetics(player.cosmetics),
    }];
  });
  const openDotaData = payload.od_data;
  const hasParsed = Boolean(
    openDotaData &&
    typeof openDotaData === "object" &&
    (openDotaData as Record<string, unknown>).has_parsed === true,
  );
  return { matchId: String(payload.match_id), hasParsed, players };
}

export async function fetchOpenDotaMatchDetails(
  matchId: string,
): Promise<OpenDotaParsedMatch> {
  try {
    const response = await fetch(
      openDotaApiUrl(`/api/matches/${encodeURIComponent(matchId)}`),
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      },
    );
    if (!response.ok) throw openDotaUnavailable();
    return parseMatchDetails(await response.json());
  } catch (error) {
    if (error instanceof CompendiumError) throw error;
    throw openDotaUnavailable();
  }
}

export function hasPlayerEquippedArcana(
  match: OpenDotaParsedMatch,
  dotaId: string,
): boolean {
  const player = match.players.find((candidate) => candidate.accountId === dotaId);
  return Boolean(player?.cosmetics.some((cosmetic) =>
    cosmetic.itemRarity?.toLowerCase() === "arcana" ||
    cosmetic.itemTypeName?.toLowerCase().includes("arcana"),
  ));
}

export async function requestOpenDotaMatchParse(
  matchId: string,
): Promise<string> {
  try {
    const response = await fetch(
      openDotaApiUrl(`/api/request/${encodeURIComponent(matchId)}`),
      {
        method: "POST",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      },
    );
    if (!response.ok) throw openDotaUnavailable();
    const payload: unknown = await response.json();
    const jobId = payload && typeof payload === "object"
      ? (payload as { job?: { jobId?: unknown } }).job?.jobId
      : null;
    if (typeof jobId !== "string" && typeof jobId !== "number") {
      throw openDotaUnavailable();
    }
    return String(jobId);
  } catch (error) {
    if (error instanceof CompendiumError) throw error;
    throw openDotaUnavailable();
  }
}
