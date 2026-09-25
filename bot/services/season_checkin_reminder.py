from __future__ import annotations

import os
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from utils.website_notifications import SEASON_ROUND_CHECKIN_REMINDER_EVENT_TYPE



async def queue_season_checkin_reminders(session: AsyncSession) -> None:
    """Queue one reminder 30 minutes before a round for unchecked players."""
    base_url = (os.getenv("PUBLIC_BASE_URL") or "https://lsesports.ru").rstrip("/")
    await session.execute(
        text(
            """
            INSERT INTO notification_outbox (
                discord_id, event_type, title, message, action_url,
                season_round_id
            )
            SELECT registration.player_id,
                   :event_type,
                   'Напоминание о чек-ине',
                   'Вы зарегистрированы на ближайший тур, но ещё не отметили '
                       || 'чек-ин. Пожалуйста, пройдите чек-ин, чтобы не получить '
                       || 'штраф за неотметку.',
                   :base_url || '/tournaments/' || tournament.slug
                       || '?round=' || round.round_number,
                   round.id
            FROM season_round_registrations registration
            JOIN season_rounds round ON round.id = registration.round_id
            JOIN tournaments tournament ON tournament.id = round.tournament_id
            LEFT JOIN season_round_checkins checkin
              ON checkin.round_id = registration.round_id
             AND checkin.player_id = registration.player_id
            WHERE round.round_kind = 'regular'
              AND round.is_visible = TRUE
              AND NOT EXISTS (
                  SELECT 1 FROM close_events close_event
                  WHERE close_event.tournament_id = tournament.id
              )
              AND season_round_status_at(round.scheduled_at, round.status)
                  IN ('planned', 'active')
              AND tournament.status IN ('registration', 'active')
              AND NOW() >= round.scheduled_at - INTERVAL '30 minutes'
              AND NOW() < round.scheduled_at - INTERVAL '10 minutes'
              AND checkin.player_id IS NULL
            ON CONFLICT (discord_id, season_round_id, event_type)
              WHERE season_round_id IS NOT NULL
            DO NOTHING
            """
        ),
        {
            "base_url": base_url,
            "event_type": SEASON_ROUND_CHECKIN_REMINDER_EVENT_TYPE,
        },
    )


async def next_season_checkin_reminder_at(
    session: AsyncSession,
) -> datetime | None:
    """Return the next unsent reminder deadline for the durable scheduler."""
    result = await session.execute(
        text(
            """
            SELECT MIN(round.scheduled_at - INTERVAL '30 minutes')
            FROM season_round_registrations registration
            JOIN season_rounds round ON round.id = registration.round_id
            JOIN tournaments tournament ON tournament.id = round.tournament_id
            LEFT JOIN season_round_checkins checkin
              ON checkin.round_id = registration.round_id
             AND checkin.player_id = registration.player_id
            WHERE round.round_kind = 'regular'
              AND round.is_visible = TRUE
              AND NOT EXISTS (
                  SELECT 1 FROM close_events close_event
                  WHERE close_event.tournament_id = tournament.id
              )
              AND season_round_status_at(round.scheduled_at, round.status)
                  IN ('planned', 'active')
              AND tournament.status IN ('registration', 'active')
              AND NOW() < round.scheduled_at - INTERVAL '10 minutes'
              AND checkin.player_id IS NULL
              AND NOT EXISTS (
                  SELECT 1 FROM notification_outbox notification
                  WHERE notification.discord_id = registration.player_id
                    AND notification.season_round_id = round.id
                    AND notification.event_type = :event_type
              )
            """
        ),
        {"event_type": SEASON_ROUND_CHECKIN_REMINDER_EVENT_TYPE},
    )
    return result.scalar_one_or_none()
