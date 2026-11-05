import type { PoolClient } from "pg";
import { buildPostseasonMatches, parseBestOf } from "@/lib/group-generation";
import { postseasonMatchKey } from "@/lib/postseason-types";
import { moscowDateTimeInputToIso } from "@/lib/moscow-date-time";
import { limitedMatchStage, postseasonScheduleRow } from "@/lib/tournament-match-schedule";
import { GroupConfigurationError } from "./group-configuration-error";
import type { GroupRow, TournamentSettings } from "./group-operation-types";

type ExistingMatch = {
  id: number; bracket_side: "upper" | "lower" | "grand_final";
  bracket_round: number; bracket_slot: number;
  protected: boolean;
};
type ScheduleRow = { scheduled_at: Date; stage_name: string; series_format: string };

export async function savePostseason(
  client: PoolClient, tournament: TournamentSettings, groups: GroupRow[],
  schedule: ScheduleRow[], mode: "missing" | "refresh", requireReplaceable = true,
): Promise<number> {
  const existing = (await client.query<ExistingMatch>(
    `SELECT id::int, bracket_side, bracket_round, bracket_slot,
       (team_a_application_id IS NOT NULL OR team_b_application_id IS NOT NULL
        OR status <> 'scheduled' OR team_a_score IS NOT NULL OR team_b_score IS NOT NULL
        OR team_a_result_label IS NOT NULL OR team_b_result_label IS NOT NULL
        OR decision_note IS NOT NULL OR result_type <> 'normal'
        OR eliminated_team_application_id IS NOT NULL) AS protected
     FROM tournament_matches WHERE tournament_id = $1
       AND bracket_side IN ('upper', 'lower', 'grand_final') FOR UPDATE`, [tournament.id],
  )).rows;
  if (mode === "missing" && existing.length) return 0;
  if (existing.some(match => match.protected)) {
    if (!requireReplaceable) return 0;
    throw new GroupConfigurationError("Нельзя перестроить плей-офф: в матчах уже назначены команды или внесены результаты. Сначала освободите незавершённую заготовку сетки.");
  }
  const plan = buildPostseasonMatches({
    groupNames: groups.map(group => group.name), advancingPerGroup: 2,
    groupAdvancement: groups,
    hasPlayoffStage: Boolean(tournament.playoff_format.trim()), playoffType: tournament.playoff_type,
  });
  if (!plan.length) throw new GroupConfigurationError("Для плей-офф нужны минимум два участника, включая хотя бы одну команду в верхней сетке.", 400);
  const ids = new Map<string, number>();
  const playoffStart = tournament.playoff_starts_on
    ? moscowDateTimeInputToIso(`${tournament.playoff_starts_on}T00:00`)
    : null;
  const retained = new Set<number>();
  for (const [index, match] of plan.entries()) {
    const key = postseasonMatchKey(match);
    const previous = existing.find(row => row.bracket_side === match.bracketSide && (
      match.bracketSide === "grand_final" || row.bracket_round === match.bracketRound && row.bracket_slot === match.bracketSlot
    ));
    if (previous) {
      await client.query(`UPDATE tournament_matches SET team_a_placeholder = $1, team_b_placeholder = $2,
        bracket_round = $3, bracket_slot = $4 WHERE id = $5`,
      [match.teamAPlaceholder, match.teamBPlaceholder, match.bracketRound, match.bracketSlot, previous.id]);
      ids.set(key, previous.id); retained.add(previous.id);
    } else {
      const row = postseasonScheduleRow(schedule, match.bracketSide, index);
      const format = match.bracketSide === "grand_final" ? tournament.final_format : tournament.playoff_format;
      const created = await client.query<{ id: number }>(
        `INSERT INTO tournament_matches(tournament_id, scheduled_at, stage, team_a_placeholder,
         team_b_placeholder, best_of, sort_order, bracket_round, bracket_side, bracket_slot)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id::int`,
        [tournament.id, row?.scheduled_at ?? (match.bracketSide === "grand_final" ? tournament.end_at : playoffStart ?? tournament.start_at),
          limitedMatchStage(row?.stage_name ?? match.stage), match.teamAPlaceholder, match.teamBPlaceholder,
          parseBestOf(row?.series_format ?? format, 1), 10_000 + index,
          match.bracketRound, match.bracketSide, match.bracketSlot],
      );
      ids.set(key, created.rows[0].id); retained.add(created.rows[0].id);
    }
  }
  // Clear links before removing obsolete empty slots, then connect the complete new plan.
  await client.query(`UPDATE tournament_matches SET winner_to_match_id = NULL, winner_to_slot = NULL,
    loser_to_match_id = NULL, loser_to_slot = NULL WHERE tournament_id = $1
    AND bracket_side IN ('upper', 'lower', 'grand_final')`, [tournament.id]);
  const obsolete = existing.filter(match => !retained.has(match.id)).map(match => match.id);
  if (obsolete.length) await client.query("DELETE FROM tournament_matches WHERE id = ANY($1::bigint[])", [obsolete]);
  for (const match of plan) {
    await client.query(`UPDATE tournament_matches SET winner_to_match_id = $1, winner_to_slot = $2,
      loser_to_match_id = $3, loser_to_slot = $4 WHERE id = $5`,
    [match.winnerTo ? ids.get(match.winnerTo.matchKey) : null, match.winnerTo?.slot ?? null,
      match.loserTo ? ids.get(match.loserTo.matchKey) : null, match.loserTo?.slot ?? null, ids.get(postseasonMatchKey(match))]);
  }
  return plan.length;
}
