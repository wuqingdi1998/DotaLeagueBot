import { DraftRequestError } from "./errors";

export function fearlessSeasonMatchId(request: Request): number | undefined {
  const value = new URL(request.url).searchParams.get("seasonMatchId");
  if (value === null) return undefined;
  const matchId = Number(value);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    throw new DraftRequestError("Некорректное сезонное лобби");
  }
  return matchId;
}
