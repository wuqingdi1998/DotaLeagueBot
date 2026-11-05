import type { PoolClient } from "pg";
import { groupMatchStage } from "@/lib/tournament-group-name";
import { savePostseason } from "./postseason-persistence";
import {
  buildGroupMatchPlan,
  parseBestOf,
} from "@/lib/group-generation";
import {
  filterTournamentMatchSchedule,
  limitedMatchStage,
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
    .flatMap((group) => {
      const teamIds = assignments
        .filter(({ groupId }) => groupId === group.id)
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(({ teamId }) => teamId);
      return buildGroupMatchPlan(teamIds, group.capacity).map((match) => ({
        ...match,
        group,
      }));
    })
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
         team_a_placeholder, team_b_placeholder,
         best_of, sort_order, bracket_round, bracket_side, bracket_slot
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'group', $12
       )`,
      [
        tournament.id,
        match.group.id,
        scheduleRow?.scheduled_at ?? tournament.start_at,
        limitedMatchStage(
          scheduleRow?.stage_name ??
            groupMatchStage(match.group.name, match.round),
        ),
        match.teamAId,
        match.teamBId,
        match.teamAPlaceholder,
        match.teamBPlaceholder,
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
  return savePostseason(client, tournament, groups, await loadSchedule(client, tournament.id, false), "missing");
}

export async function refreshPostseason(
  client: PoolClient, tournament: TournamentSettings, groups: GroupRow[], requireReplaceable = true,
) {
  return savePostseason(client, tournament, groups, await loadSchedule(client, tournament.id, false), "refresh", requireReplaceable);
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
