import { one, transaction, type query } from "@/lib/db";
import type { QueryResultRow } from "pg";
import { parsePlayerPositions } from "./model";
import { manualRankedWinSnapshot, type parseRankedWinUpdate } from "./organizer-model";
import { playerWinTarget, savePlayerRankedWins } from "./repository";
import { calculateSeasonRankedWins } from "./service";

export async function updateOrganizerRankedWins(
  update: NonNullable<ReturnType<typeof parseRankedWinUpdate>>,
  actorDiscordId: string,
) {
  const now = new Date();
  const registration = await one<{ player_id: string; scheduled_at: Date | null }>(
    `SELECT registration.player_id::text, round.scheduled_at
     FROM season_round_registrations registration
     JOIN season_rounds round ON round.id = registration.round_id
     JOIN tournaments tournament ON tournament.id = round.tournament_id
     WHERE registration.round_id = $1 AND registration.player_id = $2
       AND tournament.tournament_type = 'seasonal'`, [update.roundId, update.playerId],
  );
  if (!registration) throw new Response("Регистрация игрока не найдена", { status: 404 });
  if (update.source === "stratz" && !registration.scheduled_at) {
    throw new Response("У выбранного тура не указано время старта", { status: 409 });
  }
  const target = await playerWinTarget(update.playerId);
  const positions = parsePlayerPositions(target.positions);
  if (!positions || target.positions !== update.positions) {
    throw new Response("Роли игрока изменились или не заполнены. Обновите страницу", { status: 409 });
  }
  let snapshot;
  if (update.source === "manual") {
    snapshot = manualRankedWinSnapshot(positions, update.primaryWins, update.secondaryWins, now);
  } else {
    snapshot = await calculateSeasonRankedWins({
      checkedAt: now,
      dotaId: target.dota_id,
      positions: target.positions,
      windowEndsAt: registration.scheduled_at as Date,
    });
  }
  return transaction(async (client) => {
    const currentRegistration = await client.query<{
      scheduled_at: Date | null;
      tournament_id: number;
    }>(
      `SELECT round.tournament_id::int, round.scheduled_at
       FROM season_round_registrations registration
       JOIN season_rounds round ON round.id = registration.round_id
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE registration.round_id = $1 AND registration.player_id = $2
         AND tournament.tournament_type = 'seasonal'
       FOR UPDATE OF registration`, [update.roundId, update.playerId],
    );
    if (!currentRegistration.rowCount) throw new Response("Регистрация игрока не найдена", { status: 404 });
    if (
      currentRegistration.rows[0].scheduled_at?.getTime()
      !== registration.scheduled_at?.getTime()
    ) {
      throw new Response(
        "Время старта тура изменилось. Повторите обновление побед",
        { status: 409 },
      );
    }
    const execute: typeof query = async (sql, values) => (await client.query(sql, [...(values ?? [])])).rows;
    async function fetchOne<T extends QueryResultRow>(sql: string, values?: readonly unknown[]): Promise<T | null> {
      return (await execute<T>(sql, values))[0] ?? null;
    }
    const currentTarget = await playerWinTarget(update.playerId, fetchOne);
    if (currentTarget.positions !== target.positions || currentTarget.dota_id !== target.dota_id) {
      throw new Response("Профиль игрока изменился. Обновите страницу и повторите запрос", { status: 409 });
    }
    const isSaved = await savePlayerRankedWins(update.roundId, update.playerId, snapshot, {
      source: update.source, execute,
    });
    if (!isSaved) {
      const message = update.source === "stratz"
        ? "Победы, полученные через Dotabuff или введённые вручную, зафиксированы и не обновляются через STRATZ"
        : "Победы уже обновлены другим запросом. Обновите страницу";
      throw new Response(message, { status: 409 });
    }
    await client.query(
      `INSERT INTO tournament_audit_log
       (tournament_id, actor_discord_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'update', 'season_ranked_wins', $3, $4::jsonb)`,
      [currentRegistration.rows[0].tournament_id, actorDiscordId, update.playerId,
        JSON.stringify({ roundId: update.roundId, source: update.source,
          ...snapshot })],
    );
    return { ok: true, rankedWins: snapshot };
  });
}
