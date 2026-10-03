from __future__ import annotations

from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def open_due_tournament_registrations(session: AsyncSession) -> int:
    """Open due registrations without overriding a manually selected status."""
    result = await session.execute(
        text(
            """
            WITH opened AS (
                UPDATE tournaments
                SET status = 'registration', updated_at = NOW()
                WHERE status = 'planned'
                  AND registration_starts_at IS NOT NULL
                  AND registration_starts_at <= NOW()
                RETURNING id, registration_starts_at
            ), audit_entries AS (
                INSERT INTO tournament_audit_log (
                    tournament_id,
                    actor_discord_id,
                    action,
                    entity_type,
                    entity_id,
                    details
                )
                SELECT
                    id,
                    NULL,
                    'status_change',
                    'tournament',
                    id::text,
                    jsonb_build_object(
                        'status', 'registration',
                        'source', 'scheduled_registration_start',
                        'registration_starts_at', registration_starts_at
                    )
                FROM opened
                RETURNING id
            )
            SELECT COUNT(*)::int FROM opened
            """
        )
    )
    await session.commit()
    return int(result.scalar_one())


async def next_registration_opening_at(session: AsyncSession) -> datetime | None:
    """Return the next automatic opening time for a still-planned tournament."""
    result = await session.execute(
        text(
            """
            SELECT MIN(registration_starts_at)
            FROM tournaments
            WHERE status = 'planned'
              AND registration_starts_at IS NOT NULL
              AND registration_starts_at > NOW()
            """
        )
    )
    return result.scalar_one_or_none()
