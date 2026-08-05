import {
  isSeasonPlayerDatabaseId,
  isValidSeasonTierSnapshot,
  validSeasonRoundCount,
  validateSeasonTeams,
} from "@/lib/season";

export type SeasonEntity = "season" | "round" | "lobby" | "match" | "game";

export function requiredId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Response(`Некорректно указано поле «${label}»`, { status: 400 });
  }
  return id;
}

export function optionalDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) {
    throw new Response("Некорректная дата и время", { status: 400 });
  }
  return date.toISOString();
}

export function textValue(value: unknown, fallback: string, maxLength = 160) {
  const text = String(value ?? "").trim() || fallback;
  if (text.length > maxLength) {
    throw new Response(`Текст не должен превышать ${maxLength} символов`, {
      status: 400,
    });
  }
  return text;
}

export function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  const text = String(value ?? "");
  if (!allowed.includes(text as T)) {
    throw new Response(`Некорректное значение поля «${label}»`, {
      status: 400,
    });
  }
  return text as T;
}

export function seasonRoundCount(value: unknown) {
  const count = Number(value);
  if (!validSeasonRoundCount(count)) {
    throw new Response("Количество туров должно быть от 1 до 100", {
      status: 400,
    });
  }
  return count;
}

export function playerIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  const ids = [...new Set(value.map(String).map((id) => id.trim()))];
  if (ids.some((id) => !isSeasonPlayerDatabaseId(id))) {
    throw new Response("Некорректно выбран игрок", { status: 400 });
  }
  return ids;
}

export function seasonTeams(body: Record<string, unknown>) {
  const teamA = playerIds(body.teamAPlayerIds);
  const teamB = playerIds(body.teamBPlayerIds);
  const teamError = validateSeasonTeams(teamA, teamB);
  if (teamError) throw new Response(teamError, { status: 400 });
  return { teamA, teamB };
}

export function seasonTierSnapshots(
  value: unknown,
  selectedPlayerIds: string[],
) {
  if (
    value !== undefined &&
    (value === null || typeof value !== "object" || Array.isArray(value))
  ) {
    throw new Response("Тиры игроков переданы в неверном формате", {
      status: 400,
    });
  }
  const source = (value ?? {}) as Record<string, unknown>;
  const snapshots = new Map<string, number | null>();
  for (const playerId of selectedPlayerIds) {
    if (!Object.hasOwn(source, playerId)) continue;
    const rawTier = source[playerId];
    if (rawTier === "" || rawTier === null) {
      snapshots.set(playerId, null);
      continue;
    }
    const tier = Number(rawTier);
    if (!isValidSeasonTierSnapshot(tier)) {
      throw new Response("Тир игрока должен быть целым числом от 0 до 12", {
        status: 400,
      });
    }
    snapshots.set(playerId, tier);
  }
  return snapshots;
}
