import { query, transaction } from "@/lib/db";
import {
  publishLiveUpdate,
  seasonLobbyChannel,
} from "@/lib/live-update-events";
import { advanceCaptainSelection } from "./captain-selection";

type DueCaptainStage = {
  matchId: number;
};

type CaptainStageStatus = {
  status: string;
};

export async function advanceExpiredCaptainSelections(): Promise<{
  checked: number;
  advanced: number;
}> {
  const dueStages = await query<DueCaptainStage>(
    `SELECT match_id::int AS "matchId"
     FROM season_match_rooms
     WHERE status IN ('captain_interest', 'captain_voting', 'captain_tiebreak')
       AND captain_stage_deadline_at <= NOW()
     ORDER BY captain_stage_deadline_at, match_id
     LIMIT 100`,
  );
  let advanced = 0;
  for (const stage of dueStages) {
    const hasAdvanced = await transaction(async (client) => {
      const before = await client.query<CaptainStageStatus>(
        "SELECT status FROM season_match_rooms WHERE match_id = $1",
        [stage.matchId],
      );
      await advanceCaptainSelection(client, stage.matchId);
      const after = await client.query<CaptainStageStatus>(
        "SELECT status FROM season_match_rooms WHERE match_id = $1",
        [stage.matchId],
      );
      return before.rows[0]?.status !== after.rows[0]?.status;
    });
    if (hasAdvanced) {
      advanced += 1;
      publishLiveUpdate(seasonLobbyChannel(stage.matchId));
    }
  }
  return { checked: dueStages.length, advanced };
}
