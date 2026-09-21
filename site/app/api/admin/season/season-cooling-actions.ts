import { transaction } from "@/lib/db";
import { calculateSeasonCooling } from "@/lib/season-cooling";
import { requiredId } from "./season-admin-model";
import { resolveSeasonPlayer } from "./season-admin-player";

type CoolingRoundRow = {
  id: number;
  round_number: number;
  status: string;
};

type CoolingEventRow = {
  round_number: number;
  fire_count: number;
};

export async function approveSeasonCooling(body: Record<string, unknown>) {
  const tournamentId = requiredId(body.tournamentId, "турнир");
  const roundId = requiredId(body.roundId, "тур");
  return transaction(async (client) => {
    const player = await resolveSeasonPlayer(client, body.playerId);
    const tournament = await client.query(
      "SELECT id FROM tournaments WHERE id = $1 AND tournament_type = 'seasonal' FOR UPDATE",
      [tournamentId],
    );
    if (!tournament.rowCount) {
      throw new Response("Сезонный турнир не найден", { status: 404 });
    }
    const [rounds, events, approvals] = await Promise.all([
      client.query<CoolingRoundRow>(
        `SELECT id::int, round_number::int,
           season_round_status_at(scheduled_at, status) AS status
         FROM season_rounds
         WHERE tournament_id = $1 AND round_kind = 'regular'
         ORDER BY round_number`,
        [tournamentId],
      ),
      client.query<CoolingEventRow>(
        `SELECT round.round_number::int, event.fire_count::int
         FROM season_penalty_events event
         JOIN season_rounds round ON round.id = event.round_id
         WHERE event.tournament_id = $1 AND event.player_id = $2
           AND round.round_kind = 'regular'`,
        [tournamentId, player.discord_id],
      ),
      client.query<{ round_number: number }>(
        `SELECT round.round_number::int
         FROM season_penalty_cooling cooling
         JOIN season_rounds round ON round.id = cooling.round_id
         WHERE cooling.tournament_id = $1 AND cooling.player_id = $2`,
        [tournamentId, player.discord_id],
      ),
    ]);
    const state = calculateSeasonCooling(
      rounds.rows.map((round) => ({
        roundNumber: round.round_number,
        isCompleted: round.status === "completed",
      })),
      events.rows.map((event) => ({
        roundNumber: event.round_number,
        fires: event.fire_count,
      })),
      approvals.rows.map((approval) => approval.round_number),
    );
    if (rounds.rows.find((round) => round.id === roundId)?.round_number !== state.pendingRoundNumber) {
      throw new Response("Охлаждение уже недоступно. Обновите страницу", {
        status: 409,
      });
    }
    await client.query(
      `INSERT INTO season_penalty_cooling (tournament_id, player_id, round_id)
       VALUES ($1, $2, $3)`,
      [tournamentId, player.discord_id, roundId],
    );
    return { ok: true };
  });
}
