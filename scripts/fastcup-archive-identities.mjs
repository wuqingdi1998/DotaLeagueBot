import { key } from "./fastcup-archive-parser.mjs";

export const buildDotaIdRegistry = (tournaments) => {
  const occurrences = tournaments.flatMap((tournament) =>
    tournament.teams.flatMap((team) => team.players
      .filter((player) => player.dotaId)
      .map((player) => ({
        nicknameKey: key(player.linkedNickname),
        tournamentNumber: tournament.number,
        dotaId: player.dotaId,
      }))),
  );
  const contaminated = new Set();
  const tournamentDotaIds = new Map();
  for (const occurrence of occurrences) {
    const occurrenceKey = `${occurrence.tournamentNumber}:${occurrence.dotaId}`;
    if (!tournamentDotaIds.has(occurrenceKey)) {
      tournamentDotaIds.set(occurrenceKey, new Set());
    }
    tournamentDotaIds.get(occurrenceKey).add(occurrence.nicknameKey);
  }
  for (const [occurrenceKey, nicknameKeys] of tournamentDotaIds) {
    if (nicknameKeys.size > 1) contaminated.add(occurrenceKey);
  }
  const candidates = new Map();
  const rawCandidates = new Map();
  for (const occurrence of occurrences) {
    if (!rawCandidates.has(occurrence.nicknameKey)) {
      rawCandidates.set(occurrence.nicknameKey, new Set());
    }
    rawCandidates.get(occurrence.nicknameKey).add(occurrence.dotaId);
    const occurrenceKey = `${occurrence.tournamentNumber}:${occurrence.dotaId}`;
    if (contaminated.has(occurrenceKey)) continue;
    if (!candidates.has(occurrence.nicknameKey)) {
      candidates.set(occurrence.nicknameKey, new Set());
    }
    candidates.get(occurrence.nicknameKey).add(occurrence.dotaId);
  }
  return new Map(
    [...candidates]
      .filter(([nicknameKey, dotaIds]) =>
        dotaIds.size === 1 && rawCandidates.get(nicknameKey).size === 1,
      )
      .map(([nicknameKey, dotaIds]) => [nicknameKey, [...dotaIds][0]]),
  );
};

export const findDotaIdConflicts = (tournaments) => {
  const entries = new Map();
  for (const tournament of tournaments) {
    for (const team of tournament.teams) {
      for (const player of team.players) {
        if (!player.dotaId) continue;
        const nicknameKey = key(player.linkedNickname);
        if (!entries.has(nicknameKey)) entries.set(nicknameKey, []);
        entries.get(nicknameKey).push({
          nickname: player.linkedNickname,
          tournamentNumber: tournament.number,
          dotaId: player.dotaId,
        });
      }
    }
  }
  return [...entries.values()].filter(
    (items) => new Set(items.map((item) => item.dotaId)).size > 1,
  );
};

export const findSharedDotaIdConflicts = (tournaments) => {
  const groups = new Map();
  for (const tournament of tournaments) {
    for (const team of tournament.teams) {
      for (const player of team.players) {
        if (!player.dotaId) continue;
        const groupKey = `${tournament.number}:${player.dotaId}`;
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey).push({
          tournamentNumber: tournament.number,
          dotaId: player.dotaId,
          nickname: player.nickname,
          nicknameKey: key(player.linkedNickname),
        });
      }
    }
  }
  return [...groups.values()].filter(
    (items) => new Set(items.map((item) => item.nicknameKey)).size > 1,
  );
};

export const dotaIdFor = (player, registry) =>
  registry.get(key(player.linkedNickname)) ?? null;
