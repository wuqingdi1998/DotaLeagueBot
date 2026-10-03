import { one, query, transaction } from "@/lib/db";
import type { OctoberClanAssignment } from "../model/clan-assignment";
import {
  summarizeOctoberLaunchPlayers,
  type OctoberFormationStatus,
  type OctoberLaunchReport,
  type OctoberLaunchReportPlayer,
} from "../model/launch-report";
import type {
  OctoberFormationCandidateRecord,
} from "./clan-formation-repository";
import type { OctoberOpenDotaActivity } from "./opendota-clan-activity";

const launchCenterPath = "/organizer/compendium-october/launch";

function launchCenterUrl(): string {
  const baseUrl = (process.env.PUBLIC_BASE_URL ?? "https://lsesports.ru")
    .replace(/\/+$/, "");
  return `${baseUrl}${launchCenterPath}`;
}

export async function saveOctoberClanFormationDraft(input: {
  candidates: readonly OctoberFormationCandidateRecord[];
  activityByPlayer: ReadonlyMap<string, OctoberOpenDotaActivity>;
  assignments: readonly OctoberClanAssignment[];
}): Promise<number> {
  const activityRows = input.candidates.map((candidate) => {
    const activity = input.activityByPlayer.get(candidate.discordId);
    return {
      player_id: candidate.discordId,
      previous_compendium_stars: candidate.previousCompendiumStars,
      matches_last_three_months: activity?.matchesLastThreeMonths ?? 0,
      ranked_matches_last_three_months: activity?.rankedMatchesLastThreeMonths ?? 0,
      last_match_at: activity?.lastMatchAt ?? null,
      internal_rating: candidate.internalRating,
      rank_tier: candidate.rankTier,
      open_dota_status: activity?.status ?? "unavailable",
    };
  });
  return transaction(async (client) => {
    await client.query("DELETE FROM october_compendium_clan_activity");
    await client.query("DELETE FROM october_compendium_clan_assignment_drafts");
    await client.query(
      `INSERT INTO october_compendium_clan_activity
         (player_id, previous_compendium_stars, matches_last_three_months,
          ranked_matches_last_three_months, last_match_at, internal_rating,
          rank_tier, open_dota_status, fetched_at)
       SELECT item.player_id::bigint, item.previous_compendium_stars,
         item.matches_last_three_months, item.ranked_matches_last_three_months,
         item.last_match_at, item.internal_rating, item.rank_tier,
         item.open_dota_status, NOW()
       FROM jsonb_to_recordset($1::jsonb) AS item(
         player_id text, previous_compendium_stars int,
         matches_last_three_months int, ranked_matches_last_three_months int,
         last_match_at timestamptz, internal_rating int, rank_tier int,
         open_dota_status varchar
       )`,
      [JSON.stringify(activityRows)],
    );
    await client.query(
      `INSERT INTO october_compendium_clan_assignment_drafts
         (player_id, clan_id, assignment_source, activity_score,
          decision_order, decision_reason)
       SELECT item.player_id::bigint, item.clan_id, item.assignment_source,
         item.activity_score, item.decision_order, item.decision_reason
       FROM jsonb_to_recordset($1::jsonb) AS item(
         player_id text, clan_id varchar, assignment_source varchar,
         activity_score numeric, decision_order int, decision_reason text
       )`,
      [JSON.stringify(input.assignments.map((assignment) => ({
        player_id: assignment.discordId,
        clan_id: assignment.clanId,
        assignment_source: assignment.source,
        activity_score: assignment.activityScore,
        decision_order: assignment.decisionOrder,
        decision_reason: assignment.reason,
      })))],
    );
    const notified = await client.query(
      `INSERT INTO notification_outbox
         (discord_id, event_type, title, message, action_url)
       SELECT organizer.discord_id, 'october_compendium_launch_review',
         'Распределение Компендиума готово',
         'Проверьте отчёт и до 00:00 подтвердите или отмените запуск.', $1
       FROM trusted_organizers organizer
       JOIN players player ON player.discord_id = organizer.discord_id
       WHERE player.is_archived = FALSE
       ON CONFLICT DO NOTHING`,
      [launchCenterUrl()],
    );
    await client.query(
      `UPDATE october_compendium_clan_formation
       SET status = 'review', prepared_at = NOW(), decision_at = NULL,
           decided_by = NULL, completed_at = NULL, error_message = NULL,
           updated_at = NOW()
       WHERE singleton = TRUE`,
    );
    return notified.rowCount ?? 0;
  });
}

type LaunchStateRow = {
  status: OctoberFormationStatus;
  prepared_at: Date | null;
  decision_at: Date | null;
  decided_by_name: string | null;
  error_message: string | null;
};

type LaunchPlayerRow = {
  discord_id: string;
  dota_id: string;
  player_name: string;
  clan_id: OctoberLaunchReportPlayer["clanId"];
  assignment_source: OctoberLaunchReportPlayer["source"];
  activity_score: string;
  decision_order: number;
  decision_reason: string;
  previous_compendium_stars: number;
  matches_last_three_months: number;
  ranked_matches_last_three_months: number;
  last_match_at: Date | null;
  internal_rating: number;
  rank_tier: number;
  open_dota_status: OctoberLaunchReportPlayer["openDotaStatus"];
};

export async function loadOctoberLaunchReport(): Promise<OctoberLaunchReport> {
  const [state, rows] = await Promise.all([
    one<LaunchStateRow>(
      `SELECT formation.status, formation.prepared_at, formation.decision_at,
         player.ingame_name AS decided_by_name, formation.error_message
       FROM october_compendium_clan_formation formation
       LEFT JOIN players player ON player.discord_id = formation.decided_by
       WHERE formation.singleton = TRUE`,
    ),
    query<LaunchPlayerRow>(
      `SELECT player.discord_id::text, player.steam_id32::text AS dota_id,
         player.ingame_name AS player_name, draft.clan_id,
         draft.assignment_source, draft.activity_score::text,
         draft.decision_order, draft.decision_reason,
         activity.previous_compendium_stars, activity.matches_last_three_months,
         activity.ranked_matches_last_three_months, activity.last_match_at,
         activity.internal_rating, activity.rank_tier, activity.open_dota_status
       FROM october_compendium_clan_assignment_drafts draft
       JOIN players player ON player.discord_id = draft.player_id
       JOIN october_compendium_clan_activity activity
         ON activity.player_id = draft.player_id
       ORDER BY draft.decision_order`,
    ),
  ]);
  const players: OctoberLaunchReportPlayer[] = rows.map((row) => ({
    discordId: row.discord_id,
    dotaId: row.dota_id,
    playerName: row.player_name,
    clanId: row.clan_id,
    source: row.assignment_source,
    activityScore: Number(row.activity_score),
    decisionOrder: row.decision_order,
    reason: row.decision_reason,
    previousCompendiumStars: Number(row.previous_compendium_stars),
    matchesLastThreeMonths: Number(row.matches_last_three_months),
    rankedMatchesLastThreeMonths: Number(row.ranked_matches_last_three_months),
    lastMatchAt: row.last_match_at?.toISOString() ?? null,
    internalRating: Number(row.internal_rating),
    rankTier: Number(row.rank_tier),
    openDotaStatus: row.open_dota_status,
  }));
  return {
    status: state?.status ?? "pending",
    preparedAt: state?.prepared_at?.toISOString() ?? null,
    decisionAt: state?.decision_at?.toISOString() ?? null,
    decidedByName: state?.decided_by_name ?? null,
    errorMessage: state?.error_message ?? null,
    players,
    ...summarizeOctoberLaunchPlayers(players),
  };
}

export async function decideOctoberLaunch(
  decision: "approve" | "cancel",
  administratorId: string | null,
): Promise<void> {
  const status = decision === "approve" ? "approved" : "cancelled";
  const result = await query(
    `UPDATE october_compendium_clan_formation
     SET status = $1, decision_at = NOW(), decided_by = $2,
         error_message = NULL, updated_at = NOW()
     WHERE singleton = TRUE AND status = 'review'
     RETURNING status`,
    [status, administratorId],
  );
  if (!result.length) throw new Error("LAUNCH_DECISION_UNAVAILABLE");
}

export async function publishApprovedOctoberClans(): Promise<
  "waiting" | "cancelled" | "published"
> {
  return transaction(async (client) => {
    const state = await client.query<{ status: OctoberFormationStatus }>(
      `SELECT status FROM october_compendium_clan_formation
       WHERE singleton = TRUE FOR UPDATE`,
    );
    const status = state.rows[0]?.status ?? "pending";
    if (status === "cancelled") return "cancelled";
    if (status === "complete") return "published";
    if (status !== "approved") return "waiting";
    await client.query(
      `UPDATE october_compendium_clan_formation
       SET status = 'publishing', updated_at = NOW()
       WHERE singleton = TRUE`,
    );
    await client.query("DELETE FROM october_compendium_clan_members");
    await client.query(
      `INSERT INTO october_compendium_clan_members
         (player_id, clan_id, assigned_at, total_points,
          assignment_source, activity_score)
       SELECT player_id, clan_id, NOW(), 0, assignment_source, activity_score
       FROM october_compendium_clan_assignment_drafts`,
    );
    await client.query(
      `UPDATE october_compendium_clan_formation
       SET status = 'complete', completed_at = NOW(), error_message = NULL,
           updated_at = NOW()
       WHERE singleton = TRUE`,
    );
    return "published";
  });
}
