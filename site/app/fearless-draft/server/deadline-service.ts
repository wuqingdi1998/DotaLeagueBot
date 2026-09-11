import { one, query } from "@/lib/db";
import {
  fearlessDraftChannel,
  publishLiveUpdate,
} from "@/lib/live-update-events";
import {
  DRAFT_END_REQUEST_TTL_MINUTES,
} from "../model/config";
import { draftTurnDeadline } from "../model/deadline";
import { settleExpiredDraftEndRequests } from "./agreement-service";
import { advanceAllBotDrafts } from "./bot-service";
import { settleExpiredDraftSeries } from "./series-service";

type TimedDraftRow = {
  series_id: number;
  season_match_id: number | null;
  player1_id: string;
  player2_id: string;
  first_pick_player_id: string;
  current_step: number;
  step_started_at: Date;
  player1_reserve_seconds: number;
  player2_reserve_seconds: number;
};

type DatabaseClock = { now: Date };
type DeadlineRow = { deadline: Date | null };

function turnDeadline(row: TimedDraftRow): Date | null {
  return draftTurnDeadline({
    player1Id: row.player1_id,
    player2Id: row.player2_id,
    firstPickPlayerId: row.first_pick_player_id,
    currentStep: row.current_step,
    stepStartedAt: row.step_started_at,
    player1ReserveSeconds: row.player1_reserve_seconds,
    player2ReserveSeconds: row.player2_reserve_seconds,
  });
}

async function timedDrafts(): Promise<TimedDraftRow[]> {
  return query<TimedDraftRow>(
    `SELECT series.id::int AS series_id, series.season_match_id::int,
            series.player1_id::text, series.player2_id::text,
            map.first_pick_player_id::text, map.current_step::int,
            map.step_started_at,
            map.player1_reserve_seconds::float8,
            map.player2_reserve_seconds::float8
     FROM draft_series series
     JOIN draft_maps map
       ON map.series_id = series.id AND map.map_number = series.current_map
     WHERE series.status = 'DRAFTING' AND map.status = 'DRAFTING'
       AND map.step_started_at IS NOT NULL
       AND map.first_pick_player_id IS NOT NULL`,
  );
}

async function nextDeadline(drafts: TimedDraftRow[]): Promise<Date | null> {
  const [invitation, endRequest] = await Promise.all([
    one<DeadlineRow>(
      `SELECT MIN(expires_at) AS deadline
       FROM draft_invitations WHERE status = 'PENDING'`,
    ),
    one<DeadlineRow>(
      `SELECT MIN(end_requested_at + ($1::int * INTERVAL '1 minute')) AS deadline
       FROM draft_series
       WHERE status = ANY($2::text[])
         AND end_requested_by IS NOT NULL
         AND end_requested_at IS NOT NULL`,
      [DRAFT_END_REQUEST_TTL_MINUTES, ["CHOOSING", "DRAFTING", "MAP_COMPLETE"]],
    ),
  ]);
  const deadlines = [
    invitation?.deadline ?? null,
    endRequest?.deadline ?? null,
    ...drafts.map(turnDeadline),
  ].filter((deadline): deadline is Date => deadline !== null);
  return deadlines.reduce<Date | null>(
    (earliest, deadline) => !earliest || deadline < earliest ? deadline : earliest,
    null,
  );
}

export async function processFearlessDraftDeadlines(): Promise<{
  expiredInvitations: number;
  expiredEndRequests: number;
  expiredTurns: number;
  nextDueAt: string | null;
}> {
  await advanceAllBotDrafts();
  const expiredInvitations = await query<{ id: number }>(
    `UPDATE draft_invitations
     SET status = 'EXPIRED', responded_at = NOW()
     WHERE status = 'PENDING' AND expires_at <= NOW()
     RETURNING id::int`,
  );
  const endedSeasonMatches = await settleExpiredDraftEndRequests();
  const [clock, drafts] = await Promise.all([
    one<DatabaseClock>("SELECT NOW() AS now"),
    timedDrafts(),
  ]);
  let expiredTurns = 0;
  const changedSeasonMatches = new Set<number>();
  for (const draft of drafts) {
    const deadline = turnDeadline(draft);
    if (!deadline || !clock || deadline > clock.now) continue;
    if (await settleExpiredDraftSeries(draft.series_id)) {
      expiredTurns += 1;
      if (draft.season_match_id) changedSeasonMatches.add(draft.season_match_id);
    }
  }
  await advanceAllBotDrafts();
  for (const matchId of endedSeasonMatches) {
    if (matchId) changedSeasonMatches.add(matchId);
  }
  if (expiredInvitations.length || endedSeasonMatches.length || expiredTurns) {
    publishLiveUpdate(fearlessDraftChannel(null));
    for (const matchId of changedSeasonMatches) {
      publishLiveUpdate(fearlessDraftChannel(matchId));
    }
  }
  const nextDueAt = await nextDeadline(await timedDrafts());
  return {
    expiredInvitations: expiredInvitations.length,
    expiredEndRequests: endedSeasonMatches.length,
    expiredTurns,
    nextDueAt: nextDueAt?.toISOString() ?? null,
  };
}
