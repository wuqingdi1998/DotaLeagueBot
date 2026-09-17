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
    return int(result.scalar_one())


async def sync_close_tournament_participants(
    session: AsyncSession,
    close_event_id: int,
) -> None:
    await session.execute(
        text("SELECT sync_close_tournament_participants(:close_event_id)"),
        {"close_event_id": close_event_id},
    )
