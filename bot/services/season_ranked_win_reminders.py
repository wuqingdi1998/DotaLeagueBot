from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from utils.website_notifications import ADMINISTRATOR_MENTION


REGISTRATION_EVENT_TYPE = "season_ranked_wins_registration_reminder"
ROUND_EVENT_TYPE = "season_ranked_wins_48_hour_reminder"


def ranked_win_reminder_message(
    *,
    round_number: int,
    round_url: str,
    missing_primary_wins: int,
    missing_secondary_wins: int,
) -> str:
    return (
        f"Ты зарегистрирован на [{round_number} тур]({round_url}) "
        "Linken's Sphere Esports, на данный момент для участия тебе не хватает "
        f"**{missing_primary_wins} рейтинговых побед на основной роли** и "
        f"**{missing_secondary_wins} рейтинговых побед на дополнительной роли**. "
        "Сняться без штрафа можно не позже чем за 24 часа до старта тура!\n\n"
        "Возможны ошибки при подсчёте рейтинговых побед, в случае недосчёта "
        "матчей и обнаруженной очевидной ошибки сообщайте об этом "
        f"{ADMINISTRATOR_MENTION} заранее!"
    )


async def queue_due_ranked_win_reminders(
    session: AsyncSession,
    base_url: str,
) -> int:
    result = await session.execute(
        text(
            """
            WITH registered_players AS (
                SELECT registration.player_id::bigint AS discord_id,
                       registration.created_at AS registration_created_at,
                       round.id::bigint AS round_id,
                       round.round_number::int AS round_number,
                       round.scheduled_at,
                       tournament.slug,
                       settings.primary_role_wins_required::int,
                       settings.secondary_role_wins_required::int,
                       settings.registration_delay_minutes::int,
                       settings.round_lead_minutes::int,
                       settings.registration_reminders_start_at,
                       settings.scheduled_reminders_start_at,
                       ranked_wins.primary_wins::int,
                       ranked_wins.secondary_wins::int,
                       ranked_wins.checked_at AS ranked_wins_checked_at
                FROM season_round_registrations AS registration
                JOIN season_rounds AS round ON round.id = registration.round_id
                JOIN tournaments AS tournament ON tournament.id = round.tournament_id
                JOIN season_ranked_win_reminder_settings AS settings
                  ON settings.tournament_id = tournament.id
                JOIN season_ranked_win_checks AS ranked_wins
                  ON ranked_wins.player_id = registration.player_id
                WHERE round.round_kind = 'regular'
                  AND round.is_visible = TRUE
                  AND round.scheduled_at IS NOT NULL
                  AND season_round_status_at(round.scheduled_at, round.status)
                        = 'planned'
                  AND tournament.status IN ('registration', 'active')
            ), reminder_candidates AS (
                SELECT registered_players.*,
                       CAST(:registration_event_type AS varchar(80)) AS event_type,
                       registration_created_at
                         + make_interval(mins => registration_delay_minutes)
                         AS reminder_at,
                       registration_created_at AS counts_fresh_after
                FROM registered_players
                WHERE registration_created_at > registration_reminders_start_at
                UNION ALL
                SELECT registered_players.*,
                       CAST(:round_event_type AS varchar(80)) AS event_type,
                       scheduled_at - make_interval(mins => round_lead_minutes)
                         AS reminder_at,
                       scheduled_at - make_interval(mins => round_lead_minutes)
                         - INTERVAL '15 minutes' AS counts_fresh_after
                FROM registered_players
                WHERE scheduled_at - make_interval(mins => round_lead_minutes)
                        >= scheduled_reminders_start_at
                UNION ALL
                SELECT registered_players.*,
                       catch_up.event_type,
                       catch_up.scheduled_at AS reminder_at,
                       catch_up.scheduled_at - INTERVAL '15 minutes'
                         AS counts_fresh_after
                FROM registered_players
                JOIN season_ranked_win_reminder_catch_ups AS catch_up
                  ON catch_up.round_id = registered_players.round_id
            )
            SELECT discord_id, round_id, round_number, slug, event_type,
                   primary_role_wins_required - primary_wins
                     AS missing_primary_wins,
                   secondary_role_wins_required - secondary_wins
                     AS missing_secondary_wins
            FROM reminder_candidates AS candidate
            WHERE NOW() >= reminder_at
              AND NOW() < scheduled_at
              AND registration_created_at <= reminder_at
              AND primary_wins < primary_role_wins_required
              AND secondary_wins < secondary_role_wins_required
              AND ranked_wins_checked_at >= counts_fresh_after
              AND NOT EXISTS (
                SELECT 1
                FROM notification_outbox AS existing
                WHERE existing.discord_id = candidate.discord_id
                  AND existing.season_round_id = candidate.round_id
                  AND existing.event_type = candidate.event_type
              )
            ORDER BY reminder_at, round_id, discord_id
            """
        ),
        {
            "registration_event_type": REGISTRATION_EVENT_TYPE,
            "round_event_type": ROUND_EVENT_TYPE,
        },
    )
    candidates = result.mappings().all()
    if not candidates:
        return 0

    notifications = []
    for candidate in candidates:
        round_number = int(candidate["round_number"])
        round_url = (
            f"{base_url}/tournaments/{candidate['slug']}?round={round_number}"
        )
        notifications.append(
            {
                "discord_id": int(candidate["discord_id"]),
                "event_type": str(candidate["event_type"]),
                "title": "Привет!",
                "message": ranked_win_reminder_message(
                    round_number=round_number,
                    round_url=round_url,
                    missing_primary_wins=int(candidate["missing_primary_wins"]),
                    missing_secondary_wins=int(
                        candidate["missing_secondary_wins"]
                    ),
                ),
                "season_round_id": int(candidate["round_id"]),
            }
        )

    await session.execute(
        text(
            """
            INSERT INTO notification_outbox (
                discord_id, event_type, title, message, season_round_id
            )
            VALUES (
                :discord_id, :event_type, :title, :message, :season_round_id
            )
            ON CONFLICT (discord_id, season_round_id, event_type)
              WHERE season_round_id IS NOT NULL
            DO NOTHING
            """
        ),
        notifications,
    )
    return len(notifications)
