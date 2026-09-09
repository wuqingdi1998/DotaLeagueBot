import { transaction } from "@/lib/db";
import type { parseRankedWinWarningTarget } from "./organizer-model";

const RANKED_WIN_WARNING_EVENT_TYPE = "season_ranked_wins_manual_warning";
const RANKED_WIN_WARNING_TITLE = "Внимание!";

export const RANKED_WIN_WARNING_MESSAGE =
  "Возможно, у вас может не хватать наигранных рейтинговых матчей для участия "
  + "в будущем туре. Обязательно убедитесь в их наличии.\n\n"
  + "Сообщение могло быть отправлено ошибочно, если у вас достаточно рейтинговых "
  + "побед для участия – проигнорируйте это сообщение.";

export async function queueOrganizerRankedWinWarning(
  target: NonNullable<ReturnType<typeof parseRankedWinWarningTarget>>,
  actorDiscordId: string,
) {
  return transaction(async (client) => {
    const registration = await client.query<{ tournament_id: number }>(
      `SELECT round.tournament_id::int
       FROM season_round_registrations registration
       JOIN season_rounds round ON round.id = registration.round_id
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE registration.round_id = $1 AND registration.player_id = $2
         AND round.round_kind = 'regular'
         AND round.is_visible = TRUE
         AND round.scheduled_at IS NOT NULL
         AND season_round_status_at(round.scheduled_at, round.status) = 'planned'
         AND tournament.tournament_type = 'seasonal'
         AND tournament.status IN ('registration', 'active')
       FOR UPDATE OF registration`,
      [target.roundId, target.playerId],
    );
    if (!registration.rowCount) {
      throw new Response(
        "Игрок не зарегистрирован на будущий тур лиги",
        { status: 404 },
      );
    }

    const notification = await client.query<{ id: string }>(
      `INSERT INTO notification_outbox
         (discord_id, event_type, title, message, season_round_id)
       VALUES ($1, $3, $4, $5, $2)
       ON CONFLICT (discord_id, season_round_id, event_type)
         WHERE season_round_id IS NOT NULL
       DO NOTHING
       RETURNING id`,
      [
        target.playerId,
        target.roundId,
        RANKED_WIN_WARNING_EVENT_TYPE,
        RANKED_WIN_WARNING_TITLE,
        RANKED_WIN_WARNING_MESSAGE,
      ],
    );
    if (!notification.rowCount) return { ok: true, alreadySent: true };

    await client.query(
      `INSERT INTO tournament_audit_log
         (tournament_id, actor_discord_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'send_ranked_win_warning', 'season_ranked_wins', $3, $4::jsonb)`,
      [
        registration.rows[0].tournament_id,
        actorDiscordId,
        target.playerId,
        JSON.stringify({
          roundId: target.roundId,
          notificationId: notification.rows[0].id,
        }),
      ],
    );
    return { ok: true, alreadySent: false };
  });
}
