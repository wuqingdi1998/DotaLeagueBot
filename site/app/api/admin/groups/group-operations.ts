import type { PoolClient } from "pg";
import { transaction } from "@/lib/db";
import {
  buildPostseasonMatches,
  buildRoundRobinMatches,
  buildSerpentineAssignments,
  parseBestOf,
  shuffleTeamIds,
} from "@/lib/group-generation";
import {
  filterTournamentMatchSchedule,
  limitedMatchStage,
  postseasonScheduleRow,
} from "@/lib/tournament-match-schedule";

type TournamentSettings = {
  id: number;
  start_at: Date;
  end_at: Date;
  group_format: string;
  playoff_format: string;
  final_format: string;
  playoff_type: "single_elimination" | "double_elimination";
};

type GroupRow = {
  id: number;
  name: string;
  capacity: number;
  sort_order: number;
  advance_to_playoff: number;
};

type ScheduleRow = {
  scheduled_at: Date;
  stage_name: string;
  series_format: string;
};

export type GroupOperationResult = {
  groupCount: number;
  teamCount: number;
  groupMatchCount: number;
  postseasonMatchCount: number;
};

export class GroupOperationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function formTournamentGroups({
  tournamentId,
  groupCount,
  teamsPerGroup,
  actorDiscordId,
}: {
  tournamentId: number;
  groupCount: number;
  teamsPerGroup: number;
  actorDiscordId: string;
}): Promise<GroupOperationResult> {
  return transaction(async (client) => {
    const tournament = await loadTournament(client, tournamentId);
    const teamIds = await loadApprovedTeamIds(client, tournamentId);
    if (teamIds.length > groupCount * teamsPerGroup) {
      throw new GroupOperationError(
        `Для ${teamIds.length} команд не хватает мест: увеличьте число групп или команд в группе`,
        409,
      );
    }

    await replaceableGroupMatches(client, tournamentId);
    await deleteGroupMatches(client, tournamentId);
    await client.query(
      "DELETE FROM tournament_groups WHERE tournament_id = $1",
      [tournamentId],
    );

    const groups = await createGroups(
      client,
      tournament,
      groupCount,
      teamsPerGroup,
    );
    const assignments = buildSerpentineAssignments(teamIds, groups);
    await saveAssignments(client, assignments);
    const postseasonMatchCount = await createPostseasonIfMissing(
      client,
      tournament,
      groups,
    );
    await saveAudit(client, {
      tournamentId,
      actorDiscordId,
      action: "generate_groups",
      details: {
        groupCount,
        teamsPerGroup,
        teamCount: teamIds.length,
        postseasonMatchCount,
      },
    });

    return {
      groupCount,
      teamCount: teamIds.length,
      groupMatchCount: 0,
      postseasonMatchCount,
    };
  });
}

export async function shuffleTournamentGroups({
  tournamentId,
  actorDiscordId,
}: {
  tournamentId: number;
  actorDiscordId: string;
}): Promise<GroupOperationResult> {
  return transaction(async (client) => {
    const tournament = await loadTournament(client, tournamentId);
    const teamIds = await loadApprovedTeamIds(client, tournamentId);
    const groups = await loadGroups(client, tournamentId);
    if (!groups.length) {
      throw new GroupOperationError(
        "Сначала сформируйте структуру групп в управлении турниром",
        409,
      );
    }
    const totalCapacity = groups.reduce(
      (total, group) => total + group.capacity,
      0,
    );
    if (teamIds.length > totalCapacity) {
      throw new GroupOperationError(
        `Для ${teamIds.length} команд не хватает мест в созданных группах`,
        409,
      );
    }

    await replaceableGroupMatches(client, tournamentId);
    await deleteGroupMatches(client, tournamentId);
    await client.query(
      `DELETE FROM tournament_group_teams
       WHERE group_id IN (
         SELECT id FROM tournament_groups WHERE tournament_id = $1
       )`,
      [tournamentId],
    );

    const assignments = buildSerpentineAssignments(
      shuffleTeamIds(teamIds),
      groups,
    );
    await saveAssignments(client, assignments);
    const groupMatchCount = await createGroupMatches(
      client,
      tournament,
      groups,
      assignments,
    );
    const postseasonMatchCount = await createPostseasonIfMissing(
      client,
      tournament,
      groups,
    );
    await saveAudit(client, {
      tournamentId,
      actorDiscordId,
      action: "shuffle_groups",
      details: {
        groupCount: groups.length,
        teamCount: teamIds.length,
        groupMatchCount,
        postseasonMatchCount,
      },
    });

    return {
      groupCount: groups.length,
      teamCount: teamIds.length,
      groupMatchCount,
      postseasonMatchCount,
    };
  });
}

async function loadTournament(
  client: PoolClient,
  tournamentId: number,
): Promise<TournamentSettings> {
  const result = await client.query<TournamentSettings>(
    `SELECT id::int, start_at, end_at, group_format, playoff_format,
       final_format, playoff_type
     FROM tournaments
     WHERE id = $1`,
    [tournamentId],
  );
  if (!result.rows.length) {
    throw new GroupOperationError("Турнир не найден", 404);
  }
  return result.rows[0];
}

async function loadApprovedTeamIds(
  client: PoolClient,
  tournamentId: number,
): Promise<number[]> {
  const result = await client.query<{ id: number }>(
    `SELECT id::int
     FROM tournament_team_applications
     WHERE tournament_id = $1 AND status = 'approved'
     ORDER BY created_at, id`,
    [tournamentId],
  );
  return result.rows.map(({ id }) => id);
}

async function loadGroups(
  client: PoolClient,
  tournamentId: number,
): Promise<GroupRow[]> {
  const result = await client.query<GroupRow>(
    `SELECT id::int, name, team_capacity::int AS capacity,
       sort_order::int, advance_to_playoff::int
     FROM tournament_groups
     WHERE tournament_id = $1
     ORDER BY sort_order, id`,
    [tournamentId],
  );
  return result.rows;
}

async function createGroups(
  client: PoolClient,
  tournament: TournamentSettings,
  groupCount: number,
  teamsPerGroup: number,
): Promise<GroupRow[]> {
  const isDoubleElimination =
    tournament.playoff_type === "double_elimination";
  const advanceToUpper = isDoubleElimination ? 1 : 0;
  const advanceToLower = isDoubleElimination ? 1 : 0;
  const advanceToPlayoff = isDoubleElimination
    ? advanceToUpper + advanceToLower
    : Math.min(2, teamsPerGroup - 1);
  const groups: GroupRow[] = [];

  for (let index = 0; index < groupCount; index += 1) {
    const name = `Группа ${String.fromCharCode(1040 + index)}`;
    const result = await client.query<{ id: number }>(
      `INSERT INTO tournament_groups(
         tournament_id, name, sort_order, team_capacity,
         advance_to_playoff, advance_to_upper, advance_to_lower
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id::int`,
      [
        tournament.id,
        name,
        index,
        teamsPerGroup,
        advanceToPlayoff,
        advanceToUpper,
        advanceToLower,
      ],
    );
    groups.push({
      id: result.rows[0].id,
      name,
      capacity: teamsPerGroup,
      sort_order: index,
      advance_to_playoff: advanceToPlayoff,
    });
  }
  return groups;
}

async function replaceableGroupMatches(
  client: PoolClient,
  tournamentId: number,
) {
  const result = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM tournament_matches match
     WHERE match.tournament_id = $1
       AND (match.group_id IS NOT NULL OR match.bracket_side = 'group')
       AND (
         match.status <> 'scheduled'
         OR match.team_a_score IS NOT NULL
         OR match.team_b_score IS NOT NULL
         OR match.team_a_result_label IS NOT NULL
         OR match.team_b_result_label IS NOT NULL
         OR match.decision_note IS NOT NULL
         OR EXISTS (
           SELECT 1 FROM tournament_match_checkins checkin
           WHERE checkin.match_id = match.id
         )
       )`,
    [tournamentId],
  );
  if (result.rows[0].count > 0) {
    throw new GroupOperationError(
      "Нельзя переформировать группы после начала матчей группового этапа",
      409,
    );
  }
}

async function deleteGroupMatches(
  client: PoolClient,
  tournamentId: number,
) {
  await client.query(
    `DELETE FROM tournament_matches
     WHERE tournament_id = $1
       AND (group_id IS NOT NULL OR bracket_side = 'group')`,
    [tournamentId],
  );
}

async function saveAssignments(
  client: PoolClient,
  assignments: ReturnType<typeof buildSerpentineAssignments>,
) {
  for (const assignment of assignments) {
    await client.query(
      `INSERT INTO tournament_group_teams(group_id, application_id, sort_order)
       VALUES ($1, $2, $3)`,
      [assignment.groupId, assignment.teamId, assignment.sortOrder],
    );
  }
}

async function createGroupMatches(
  client: PoolClient,
  tournament: TournamentSettings,
  groups: GroupRow[],
  assignments: ReturnType<typeof buildSerpentineAssignments>,
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

async function createPostseasonIfMissing(
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

async function saveAudit(
  client: PoolClient,
  {
    tournamentId,
    actorDiscordId,
    action,
    details,
  }: {
    tournamentId: number;
    actorDiscordId: string;
    action: "generate_groups" | "shuffle_groups";
    details: Record<string, number>;
  },
) {
  await client.query(
    `INSERT INTO tournament_audit_log
      (tournament_id, actor_discord_id, action, entity_type, details)
     VALUES ($1, $2, $3, 'groups', $4::jsonb)`,
    [tournamentId, actorDiscordId, action, JSON.stringify(details)],
  );
}
