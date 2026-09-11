from __future__ import annotations

from datetime import datetime

from discord.ext import commands
from sqlalchemy import text

from database.core import async_session
from services.durable_scheduler import register_scheduled_job
from services.season_game_channel_access import (
    close_category_after_completed_rounds,
    next_season_game_category_change_at,
    open_category_for_due_host_notifications,
)
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
            await open_category_for_due_host_notifications(self.bot, session)
            await deliver_due_season_lobby_notifications(self.bot, session)
            await close_category_after_completed_rounds(self.bot, session)

    async def next_due_at(self) -> datetime | None:
        async with async_session() as session:
            notification_result = await session.execute(
                text(
                    """
                    SELECT MIN(scheduled_for)
                    FROM season_lobby_notification_outbox
                    WHERE status = 'pending'
                    """
                )
            )
            notification_due_at = notification_result.scalar_one_or_none()
            category_due_at = await next_season_game_category_change_at(session)
            known_due_times = [
                due_at
                for due_at in (notification_due_at, category_due_at)
                if due_at is not None
            ]
            return min(known_due_times, default=None)


async def setup(bot: commands.Bot) -> None:
    cog = SeasonLobbyNotifications(bot)
    await bot.add_cog(cog)
    register_scheduled_job(bot, cog)
