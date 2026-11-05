import type { PoolClient } from "pg";
import { transaction } from "@/lib/db";
import { groupMatchStage } from "@/lib/tournament-group-name";
import { limitedMatchStage } from "@/lib/tournament-match-schedule";
import { GroupConfigurationError } from "./group-configuration-error";
import { refreshPostseason } from "./group-match-creation";
import type { GroupRow, TournamentSettings } from "./group-operation-types";

export type GroupSettingsInput = {
  groupId?: number; name?: string | null; explanation?: string | null;
  teamCapacity?: number; advanceToPlayoff?: number; advanceToUpper?: number; advanceToLower?: number;
};

export async function updateGroupSettings(body: GroupSettingsInput, actorDiscordId: string | null) {
  const groupId = Number(body.groupId), capacity = Number(body.teamCapacity);
  if (!Number.isInteger(groupId) || groupId < 1 || !Number.isInteger(capacity) || capacity < 3 || capacity > 8) {
    throw new GroupConfigurationError("Укажите группу и количество команд от 3 до 8", 400);
  }
  if (body.name !== undefined && body.name !== null && (typeof body.name !== "string" || body.name.trim().length > 80)) {
    throw new GroupConfigurationError("Название группы должно содержать не более 80 символов", 400);
  }
  return transaction(async client => {
    const lookup = await client.query<{ tournament_id: number }>("SELECT tournament_id::int FROM tournament_groups WHERE id = $1", [groupId]);
    if (!lookup.rows.length) throw new GroupConfigurationError("Группа не найдена", 404);
    const tournamentId = lookup.rows[0].tournament_id;
    await client.query("SELECT pg_advisory_xact_lock(71004, $1::int)", [tournamentId]);
    const tournament = (await client.query<TournamentSettings>(`SELECT id::int, start_at, end_at, group_format,
      playoff_format, final_format, playoff_type, playoff_starts_on::text FROM tournaments WHERE id = $1 FOR UPDATE`, [tournamentId])).rows[0];
    const groups = (await client.query<GroupRow>(`SELECT id::int, name, team_capacity::int AS capacity, sort_order::int,
      advance_to_playoff::int, advance_to_upper::int, advance_to_lower::int FROM tournament_groups
      WHERE tournament_id = $1 ORDER BY sort_order, id FOR UPDATE`, [tournamentId])).rows;
    const group = groups.find(row => row.id === groupId);
    if (!group) throw new GroupConfigurationError("Группа не найдена", 404);
    const teamCount = (await client.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM tournament_group_teams WHERE group_id = $1", [groupId])).rows[0].count;
    if (teamCount > capacity) throw new GroupConfigurationError(`В группе уже ${teamCount} команд — нельзя установить меньшую вместимость`);
    const isDoubleElimination = tournament.playoff_type === "double_elimination";
    const upper = isDoubleElimination ? Number(body.advanceToUpper ?? 0) : 0;
    const lower = isDoubleElimination ? Number(body.advanceToLower ?? 0) : 0;
    const total = isDoubleElimination ? upper + lower : Number(body.advanceToPlayoff ?? 0);
    if (![upper, lower, total].every(Number.isInteger) || upper < 0 || lower < 0 || total < 1 || total > capacity) {
      throw new GroupConfigurationError("Укажите корректное число команд, выходящих из группы", 400);
    }
    const name = body.name === undefined ? group.name : (body.name ?? "").trim();
    if (name && groups.some(row => row.id !== groupId && row.name === name)) {
      throw new GroupConfigurationError("Группа с таким названием уже существует");
    }
    const hasChangedAdvancement = total !== group.advance_to_playoff || upper !== group.advance_to_upper || lower !== group.advance_to_lower;
    const previousName = group.name;
    await client.query(`UPDATE tournament_groups SET name = $1, explanation = $2, team_capacity = $3,
      advance_to_playoff = $4, advance_to_upper = $5, advance_to_lower = $6 WHERE id = $7`,
    [name, body.explanation?.trim() || null, capacity, total, upper, lower, groupId]);
    Object.assign(group, { name, capacity, advance_to_playoff: total, advance_to_upper: upper, advance_to_lower: lower });
    // Refresh only empty playoff slots; changed qualification must never silently leave an outdated bracket.
    await refreshPostseason(client, tournament, groups, hasChangedAdvancement);
    if (name !== previousName) await renameGeneratedGroupStages(client, groupId, previousName, name);
    await client.query(`INSERT INTO tournament_audit_log
      (tournament_id, actor_discord_id, action, entity_type, entity_id, details)
      VALUES ($1,$2,'settings_update','group',$3,$4::jsonb)`,
    [tournamentId, actorDiscordId, String(groupId), JSON.stringify({ name, teamCapacity: capacity,
      advanceToPlayoff: total, advanceToUpper: upper, advanceToLower: lower, hasExplanation: Boolean(body.explanation?.trim()) })]);
  });
}

async function renameGeneratedGroupStages(client: PoolClient, groupId: number, previous: string, name: string) {
  const matches = (await client.query<{ id: number; stage: string; bracket_round: number }>(
    "SELECT id::int, stage, bracket_round FROM tournament_matches WHERE group_id = $1", [groupId],
  )).rows;
  for (const match of matches) {
    if (match.stage !== limitedMatchStage(groupMatchStage(previous, match.bracket_round))) continue;
    await client.query("UPDATE tournament_matches SET stage = $1 WHERE id = $2", [limitedMatchStage(groupMatchStage(name, match.bracket_round)), match.id]);
  }
}
