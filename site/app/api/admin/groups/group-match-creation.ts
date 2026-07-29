import type { PoolClient } from "pg";
import {
  buildPostseasonMatches,
  buildRoundRobinMatches,
  parseBestOf,
} from "@/lib/group-generation";
import {
  filterTournamentMatchSchedule,
  limitedMatchStage,
  postseasonScheduleRow,
} from "@/lib/tournament-match-schedule";
import type {
  GroupRow,
  TournamentSettings,
} from "./group-operation-types";

type ScheduleRow = {
  scheduled_at: Date;
  stage_name: string;
  series_format: string;
};

export async function createGroupMatches(
  client: PoolClient,
  tournament: TournamentSettings,
  groups: GroupRow[],
  assignments: Array<{
    groupId: number;
    teamId: number;
    sortOrder: number;
  }>,
): Promise<number> {
  const schedule = await loadSchedule(client, tournament.id, true);
  const plannedMatches = groups
    .flatMap((group) =>
      buildRoundRobinMatches(
        assignments
          .filter(({ groupId }) => groupId === group.id)
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map(({ teamId }) => teamId),
      ).map((match) => ({ ...match, group })),
    )
    .sort(
      (left, right) =>
        left.round - right.round ||
        left.group.sort_order - right.group.sort_order ||
        left.slot - right.slot,
    );

  for (const [index, match] of plannedMatches.entries()) {
    const scheduleRow = schedule[match.round - 1];
    await client.query(
      `INSERT INTO tournament_matches(
         tournament_id, group_id, scheduled_at, stage,
         team_a_application_id, team_b_application_id,
         best_of, sort_order, bracket_round, bracket_side, bracket_slot
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'group', $10)`,
      [
        tournament.id,
        match.group.id,
        scheduleRow?.scheduled_at ?? tournament.start_at,
        limitedMatchStage(
          scheduleRow?.stage_name ??
            `Групповой этап · ${match.group.name} · Раунд ${match.round}`,
        ),
        match.teamAId,
        match.teamBId,
        parseBestOf(
          scheduleRow?.series_format ?? tournament.group_format,
          1,
        ),
        index + 1,
        match.round,
        match.slot,
      ],
    );
  }
  return plannedMatches.length;
}

export async function createPostseasonIfMissing(
  client: PoolClient,
  tournament: TournamentSettings,
  groups: GroupRow[],
): Promise<number> {
  const existing = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM tournament_matches
     WHERE tournament_id = $1
       AND bracket_side IN ('upper', 'lower', 'grand_final')`,
    [tournament.id],
  );
  if (existing.rows[0].count > 0) return 0;

  const schedule = await loadSchedule(client, tournament.id, false);
  const plan = buildPostseasonMatches({
    groupNames: groups.map(({ name }) => name),
    advancingPerGroup: groups[0]?.advance_to_playoff ?? 2,
    hasPlayoffStage: Boolean(tournament.playoff_format.trim()),
    playoffType: tournament.playoff_type,
  });
  for (const [index, match] of plan.entries()) {
    const scheduleRow = postseasonScheduleRow(
      schedule,
      match.bracketSide,
      index,
    );
    const defaultFormat =
      match.bracketSide === "grand_final"
        ? tournament.final_format
        : tournament.playoff_format;
    await client.query(
      `INSERT INTO tournament_matches(
         tournament_id, scheduled_at, stage,
         team_a_placeholder, team_b_placeholder,
         best_of, sort_order, bracket_round, bracket_side, bracket_slot
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        tournament.id,
        scheduleRow?.scheduled_at ??
          (match.bracketSide === "grand_final"
            ? tournament.end_at
            : tournament.start_at),
        limitedMatchStage(scheduleRow?.stage_name ?? match.stage),
        match.teamAPlaceholder,
        match.teamBPlaceholder,
        parseBestOf(scheduleRow?.series_format ?? defaultFormat, 1),
        10_000 + index,
        match.bracketRound,
        match.bracketSide,
        match.bracketSlot,
      ],
    );
  }
  return plan.length;
}

async function loadSchedule(
  client: PoolClient,
  tournamentId: number,
  forGroupStage: boolean,
): Promise<ScheduleRow[]> {
  const result = await client.query<ScheduleRow>(
    `SELECT
       (schedule_day.day_date + schedule_entry.start_time)
         AT TIME ZONE 'Europe/Moscow' AS scheduled_at,
       schedule_entry.stage_name,
       schedule_entry.series_format
     FROM tournament_schedule_days schedule_day
     JOIN tournament_schedule_entries schedule_entry
       ON schedule_entry.day_id = schedule_day.id
     WHERE schedule_day.tournament_id = $1
     ORDER BY schedule_day.sort_order, schedule_entry.sort_order`,
    [tournamentId],
  );
  return filterTournamentMatchSchedule(
    result.rows,
    forGroupStage ? "group" : "postseason",
  );
}
