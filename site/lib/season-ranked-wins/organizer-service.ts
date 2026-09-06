import { one, transaction, type query } from "@/lib/db";
import type { QueryResultRow } from "pg";
import { calculateRankedWinSnapshot, parsePlayerPositions, SEASON_RANKED_WIN_WINDOW_DAYS } from "./model";
import { fetchDotaBuffMonthlyRankedMatches } from "./dotabuff-month";
import { manualRankedWinSnapshot, type parseRankedWinUpdate } from "./organizer-model";
import { playerWinTarget, savePlayerRankedWins } from "./repository";
import { calculateSeasonRankedWins, SeasonRankedWinsError } from "./service";
import { hasUnresolvedBrowserWins } from "./browser-import";

export async function updateOrganizerRankedWins(
  update: NonNullable<ReturnType<typeof parseRankedWinUpdate>>,
  actorDiscordId: string,
) {
  const now = new Date();
  const registration = await one(
    `SELECT registration.player_id FROM season_round_registrations registration
     JOIN season_rounds round ON round.id = registration.round_id
     JOIN tournaments tournament ON tournament.id = round.tournament_id
     WHERE registration.round_id = $1 AND registration.player_id = $2
       AND tournament.tournament_type = 'seasonal'`, [update.roundId, update.playerId],
  );
  if (!registration) throw new Response("Регистрация игрока не найдена", { status: 404 });
  const target = await playerWinTarget(update.playerId);
  const positions = parsePlayerPositions(target.positions);
  if (!positions || target.positions !== update.positions) {
    throw new Response("Роли игрока изменились или не заполнены. Обновите страницу", { status: 409 });
  }
  let snapshot;
  if (update.source === "manual") {
    snapshot = manualRankedWinSnapshot(positions, update.primaryWins, update.secondaryWins, now);
  } else if (update.source === "stratz") {
    snapshot = await calculateSeasonRankedWins({ dotaId: target.dota_id, positions: target.positions, now });
  } else if (update.browserImport) {
    if (update.browserImport.dotaId !== target.dota_id) {
      throw new Response("История Dotabuff принадлежит другому игроку", { status: 400 });
    }
    const matches = update.browserImport.matches.map((match) => ({ ...match, startedAt: new Date(match.startedAt) }));
    const checkedAt = new Date(update.browserImport.startedAt);
    if (hasUnresolvedBrowserWins(matches, checkedAt)) {
      throw new Response("У части побед Dotabuff не указал роль. Прежние значения сохранены", { status: 422 });
    }
    snapshot = calculateRankedWinSnapshot({ matches, positions, now: checkedAt });
  } else {
    try {
      const matches = await fetchDotaBuffMonthlyRankedMatches(target.dota_id, now);
      snapshot = calculateRankedWinSnapshot({ matches, positions, now });
    } catch (error) {
      console.warn("Organizer Dotabuff wins lookup failed", {
        reason: error instanceof Error ? error.message : "unknown",
      });
      throw new SeasonRankedWinsError(`Dotabuff не вернул полную статистику за ${SEASON_RANKED_WIN_WINDOW_DAYS} дней. Прежние значения сохранены. Попробуйте позже или внесите победы вручную`);
    }
  }
  return transaction(async (client) => {
    const registration = await client.query<{ tournament_id: number }>(
      `SELECT round.tournament_id::int FROM season_round_registrations registration
       JOIN season_rounds round ON round.id = registration.round_id
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE registration.round_id = $1 AND registration.player_id = $2
         AND tournament.tournament_type = 'seasonal'
       FOR UPDATE OF registration`, [update.roundId, update.playerId],
    );
    if (!registration.rowCount) throw new Response("Регистрация игрока не найдена", { status: 404 });
    const execute: typeof query = async (sql, values) => (await client.query(sql, [...(values ?? [])])).rows;
    async function fetchOne<T extends QueryResultRow>(sql: string, values?: readonly unknown[]): Promise<T | null> {
      return (await execute<T>(sql, values))[0] ?? null;
    }
    const currentTarget = await playerWinTarget(update.playerId, fetchOne);
    if (currentTarget.positions !== target.positions || currentTarget.dota_id !== target.dota_id) {
      throw new Response("Профиль игрока изменился. Обновите страницу и повторите запрос", { status: 409 });
    }
    const isSaved = await savePlayerRankedWins(update.playerId, snapshot, {
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
      [registration.rows[0].tournament_id, actorDiscordId, update.playerId,
        JSON.stringify({ roundId: update.roundId, source: update.source,
          ...(update.browserImport ? { collectionMethod: "organizer_browser" } : {}), ...snapshot })],
    );
    return { ok: true, rankedWins: snapshot };
  });
}
