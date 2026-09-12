import type { PoolClient } from "pg";
import type { AuthUser } from "@/lib/auth";
import { MatchRoomError } from "./errors";

export type RoomTarget = {
  matchId: number;
  tournamentId: number;
  tournamentSlug: string;
  tournamentName: string;
  stage: string;
  bestOf: number;
  matchStatus: string;
  teamAName: string;
  teamBName: string;
  teamACaptainId: string;
  teamBCaptainId: string;
  teamACaptainName: string;
  teamBCaptainName: string;
  currentUserSide: "a" | "b" | null;
};

export async function requireMatchRoom(
  client: PoolClient,
  matchId: number,
  actor: AuthUser,
  lock = false,
): Promise<RoomTarget> {
  const result = await client.query<RoomTarget>(
    `SELECT match.id::int AS "matchId", tournament.id::int AS "tournamentId",
       tournament.slug AS "tournamentSlug", tournament.name AS "tournamentName",
       match.stage, match.best_of::int AS "bestOf", match.status AS "matchStatus",
       team_a.team_name AS "teamAName", team_b.team_name AS "teamBName",
       team_a.captain_discord_id::text AS "teamACaptainId",
       team_b.captain_discord_id::text AS "teamBCaptainId",
       COALESCE(captain_a.ingame_name, team_a.captain_name_snapshot) AS "teamACaptainName",
       COALESCE(captain_b.ingame_name, team_b.captain_name_snapshot) AS "teamBCaptainName",
       CASE WHEN team_a.captain_discord_id = $2 THEN 'a'
            WHEN team_b.captain_discord_id = $2 THEN 'b' ELSE NULL END AS "currentUserSide"
     FROM tournament_matches match
     JOIN tournaments tournament ON tournament.id = match.tournament_id
     JOIN tournament_team_applications team_a ON team_a.id = match.team_a_application_id
     JOIN tournament_team_applications team_b ON team_b.id = match.team_b_application_id
     LEFT JOIN ordinary_match_rooms existing_room ON existing_room.match_id = match.id
     LEFT JOIN players captain_a ON captain_a.discord_id = team_a.captain_discord_id
     LEFT JOIN players captain_b ON captain_b.discord_id = team_b.captain_discord_id
     WHERE match.id = $1 AND tournament.tournament_type = 'ordinary'
       AND tournament.ordinary_match_rooms_enabled = TRUE
       AND match.status <> 'cancelled'
       AND (match.status <> 'finished' OR existing_room.status = 'completed')
       AND ($3::boolean OR $2 IN (team_a.captain_discord_id, team_b.captain_discord_id))
     ${lock ? "FOR UPDATE OF match" : ""}`,
    [matchId, actor.discordId, actor.isAdmin],
  );
  const target = result.rows[0];
  if (!target) {
    throw new MatchRoomError(
      "Комната доступна только капитанам этого матча и организатору",
      403,
    );
  }
  return target;
}
