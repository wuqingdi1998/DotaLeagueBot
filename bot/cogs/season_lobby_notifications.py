from __future__ import annotations

from datetime import datetime

from discord.ext import commands
from sqlalchemy import text

from database.core import async_session
from services.durable_scheduler import register_scheduled_job
from services.season_lobby_notifications import (
    deliver_due_season_lobby_notifications,
)


class SeasonLobbyNotifications(commands.Cog):
    """Delivers scheduled season lobby details to hosts and players."""

    name = "season_lobby_notifications"

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def process_due(self) -> None:
        async with async_session() as session:
            await deliver_due_season_lobby_notifications(self.bot, session)

    async def next_due_at(self) -> datetime | None:
        async with async_session() as session:
            result = await session.execute(
                text(
                    """
                    SELECT MIN(scheduled_for)
                    FROM season_lobby_notification_outbox
                    WHERE status = 'pending'
                    """
                )
            )
            return result.scalar_one_or_none()


async def setup(bot: commands.Bot) -> None:
    cog = SeasonLobbyNotifications(bot)
    await bot.add_cog(cog)
    register_scheduled_job(bot, cog)
