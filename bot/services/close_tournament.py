"""Синхронизация анонса клоза с его турниром на сайте."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def ensure_close_tournament(
    session: AsyncSession,
    close_event_id: int,
) -> int:
    result = await session.execute(
        text("SELECT ensure_close_tournament(:close_event_id)"),
        {"close_event_id": close_event_id},
    )
    tournament_id = int(result.scalar_one())
    await session.execute(
        text(
            """
            UPDATE close_events
            SET game_format = canonical_close_game_format(game_format)
            WHERE id = :close_event_id
            """
        ),
        {"close_event_id": close_event_id},
    )
    await session.execute(
        text(
            """
            UPDATE tournaments tournament
            SET format = event.game_format, updated_at = NOW()
            FROM close_events event
            WHERE tournament.id = :tournament_id
              AND event.id = :close_event_id
            """
        ),
        {
            "close_event_id": close_event_id,
            "tournament_id": tournament_id,
        },
    )
    return tournament_id


async def sync_close_tournament_participants(
    session: AsyncSession,
    close_event_id: int,
) -> None:
    await session.execute(
        text("SELECT sync_close_tournament_participants(:close_event_id)"),
        {"close_event_id": close_event_id},
    )
