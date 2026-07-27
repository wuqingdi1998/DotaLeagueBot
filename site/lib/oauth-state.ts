import { secretMatches } from "./security";

export const oauthStateLifetimeMs = 10 * 60 * 1000;
export const maxPendingOauthStates = 5;

export type PendingOauthState = {
  state: string;
  returnTo: string;
  createdAt: number;
};

function isPendingOauthState(
  value: unknown,
  now: number,
): value is PendingOauthState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PendingOauthState>;
  return (
    typeof candidate.state === "string" &&
    candidate.state.length > 0 &&
    typeof candidate.returnTo === "string" &&
    typeof candidate.createdAt === "number" &&
    Number.isFinite(candidate.createdAt) &&
    candidate.createdAt <= now &&
    now - candidate.createdAt <= oauthStateLifetimeMs
  );
}

export function parsePendingOauthStates(
  raw: string | undefined,
  now = Date.now(),
): PendingOauthState[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((entry) => isPendingOauthState(entry, now))
        .slice(-maxPendingOauthStates);
    }

    // Поддержка одной попытки входа из версии сайта до обновления.
    if (parsed && typeof parsed === "object") {
      const legacy = parsed as { state?: unknown; returnTo?: unknown };
      if (
        typeof legacy.state === "string" &&
        legacy.state.length > 0 &&
        typeof legacy.returnTo === "string"
      ) {
        return [
          {
            state: legacy.state,
            returnTo: legacy.returnTo,
            createdAt: now,
          },
        ];
      }
    }
  } catch {
    return [];
  }
  return [];
}

export function addPendingOauthState(
  pending: PendingOauthState[],
  entry: PendingOauthState,
): PendingOauthState[] {
  return [...pending, entry].slice(-maxPendingOauthStates);
}

export function takePendingOauthState(
  pending: PendingOauthState[],
  receivedState: string,
): {
  returnTo: string | null;
  remaining: PendingOauthState[];
} {
  const index = pending.findIndex((entry) =>
    secretMatches(entry.state, receivedState),
  );
  if (index < 0) {
    return { returnTo: null, remaining: pending };
  }
  return {
    returnTo: pending[index].returnTo,
    remaining: pending.filter((_, entryIndex) => entryIndex !== index),
  };
}
