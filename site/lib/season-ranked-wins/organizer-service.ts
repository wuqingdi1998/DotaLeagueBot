import { one, transaction, type query } from "@/lib/db";
import type { QueryResultRow } from "pg";
import {
  SEASON_RANKED_WIN_BUTTON_TTL_MS,
  parsePlayerPositions,
  type DotaPosition,
} from "./model";
import { manualRankedWinSnapshot, type parseRankedWinUpdate } from "./organizer-model";
import { playerWinTarget, savePlayerRankedWins } from "./repository";
import { calculateSeasonRankedWins } from "./service";

export async function updateOrganizerRankedWins(
  update: NonNullable<ReturnType<typeof parseRankedWinUpdate>>,
  actorDiscordId: string,
) {
  const now = new Date();
  const registration = await one<{
    player_id: string;
    scheduled_at: Date | null;
    wins_source: string | null;
  }>(
    `SELECT registration.player_id::text, round.scheduled_at,
       ranked_wins.source AS wins_source
     FROM season_round_registrations registration
     JOIN season_rounds round ON round.id = registration.round_id
     JOIN tournaments tournament ON tournament.id = round.tournament_id
     LEFT JOIN season_ranked_win_checks ranked_wins
       ON ranked_wins.round_id = registration.round_id
      AND ranked_wins.player_id = registration.player_id
     WHERE registration.round_id = $1 AND registration.player_id = $2
       AND tournament.tournament_type = 'seasonal'`, [update.roundId, update.playerId],
  );
  if (!registration) throw new Response("Регистрация игрока не найдена", { status: 404 });
  if (
    update.source === "stratz"
    && ["manual", "dotabuff"].includes(registration.wins_source ?? "")
  ) {
    throw new Response(
      "Победы уже зафиксированы вручную или через Dotabuff. STRATZ для этого тура не проверяется",
      { status: 409 },
    );
  }
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
    const savedRows = await execute<{
      checked_at: Date;
      primary_role: number;
      primary_wins: number;
      secondary_role: number;
      secondary_wins: number;
    }>(
      `SELECT primary_role::int, secondary_role::int, primary_wins::int,
         secondary_wins::int, checked_at
       FROM season_ranked_win_checks
       WHERE round_id = $1 AND player_id = $2`,
      [update.roundId, update.playerId],
    );
    const saved = savedRows[0];
    if (!saved) {
      throw new Response("Не удалось прочитать сохранённые победы", { status: 500 });
    }
    const rankedWins = {
      primaryRole: saved.primary_role as DotaPosition,
      secondaryRole: saved.secondary_role as DotaPosition,
      primaryWins: saved.primary_wins,
      secondaryWins: saved.secondary_wins,
      checkedAt: saved.checked_at.toISOString(),
      availableUntil: new Date(
        saved.checked_at.getTime() + SEASON_RANKED_WIN_BUTTON_TTL_MS,
      ).toISOString(),
    };
    await client.query(
      `INSERT INTO tournament_audit_log
       (tournament_id, actor_discord_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'update', 'season_ranked_wins', $3, $4::jsonb)`,
      [currentRegistration.rows[0].tournament_id, actorDiscordId, update.playerId,
        JSON.stringify({ roundId: update.roundId, source: update.source,
          ...rankedWins })],
    );
    return { ok: true, rankedWins };
  });
}
