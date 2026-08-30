import { transaction } from "@/lib/db";
import { syncSeasonFinalAwards } from "@/lib/season-final-awards";
import { publishedLobbyResultValues } from "@/app/season-lobby/[matchId]/model/published-result";
import { requiredId } from "./season-admin-model";

export async function savePublishedLobbyResult(
  body: Record<string, unknown>,
  actorDiscordId: string,
) {
  const seasonMatchId = requiredId(body.matchId, "матч лобби");
  let resultValues: ReturnType<typeof publishedLobbyResultValues>;
  try {
    resultValues = publishedLobbyResultValues(body);
  } catch (error) {
    throw new Response(
      error instanceof Error ? error.message : "Проверьте результат лобби",
      { status: 400 },
    );
  }
  const { calculated, games, teamAScore, teamBScore } = resultValues;
  return transaction(async (client) => {
    const target = await client.query<{
      tournament_id: number;
      can_edit: boolean;
    }>(
      `SELECT round.tournament_id::int,
         (
           (round.round_kind = 'regular'
             AND round.lobby_configuration_status = 'published')
           OR
           (round.round_kind = 'finals'
             AND match.status IN ('published', 'completed'))
         ) AS can_edit
       FROM season_matches match
       JOIN season_lobbies lobby ON lobby.id = match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE match.id = $1 AND tournament.tournament_type = 'seasonal'
       FOR UPDATE OF match`,
      [seasonMatchId],
    );
    if (!target.rowCount) {
      throw new Response("Матч лобби не найден", { status: 404 });
    }
    if (!target.rows[0].can_edit) {
      throw new Response("Сначала опубликуйте лобби", { status: 409 });
    }

    for (const [index, game] of games.entries()) {
      await client.query(
        `INSERT INTO season_match_games
          (match_id, game_number, dota_match_id, winner_side, status)
         VALUES ($1, $2, $3, $4, 'completed')
         ON CONFLICT (match_id, game_number)
         DO UPDATE SET dota_match_id = EXCLUDED.dota_match_id,
           winner_side = EXCLUDED.winner_side,
           status = 'completed',
           updated_at = NOW()`,
        [seasonMatchId, index + 1, game.dotaMatchId, game.winnerSide],
      );
    }
    await client.query(
      `UPDATE season_matches
       SET team_a_score = $2, team_b_score = $3, result = $4,
         status = 'completed', updated_at = NOW()
       WHERE id = $1`,
      [seasonMatchId, teamAScore, teamBScore, calculated.result],
    );
    await client.query(
      `UPDATE season_match_rooms
       SET status = 'completed', updated_at = NOW()
       WHERE match_id = $1`,
      [seasonMatchId],
    );
    await client.query(
      `UPDATE draft_series SET status = 'COMPLETE', updated_at = NOW()
       WHERE season_match_id = $1`,
      [seasonMatchId],
    );
    await client.query(
      `UPDATE season_lobbies lobby
       SET status = 'completed', updated_at = NOW()
       WHERE lobby.id = (
         SELECT match.lobby_id FROM season_matches match WHERE match.id = $1
       )
       AND NOT EXISTS (
         SELECT 1 FROM season_matches sibling
         WHERE sibling.lobby_id = lobby.id AND sibling.status <> 'completed'
       )`,
      [seasonMatchId],
    );
    await client.query(
      `INSERT INTO tournament_audit_log
        (tournament_id, actor_discord_id, action, entity_type, entity_id,
         details)
       VALUES ($1, $2, 'update_lobby_result', 'season_lobby', $3, $4::jsonb)`,
      [
        target.rows[0].tournament_id,
        actorDiscordId,
        String(seasonMatchId),
        JSON.stringify({ games, teamAScore, teamBScore }),
      ],
    );
    await syncSeasonFinalAwards(
      client,
      target.rows[0].tournament_id,
      actorDiscordId,
    );
    return { ok: true };
  });
}
