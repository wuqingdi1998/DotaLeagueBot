from __future__ import annotations

from datetime import datetime

from discord.ext import commands
from sqlalchemy import text

from database.core import async_session
from services.durable_scheduler import register_scheduled_job
from services.channel_announcement_delivery import (
    deliver_pending_announcement_reports,
    deliver_pending_channel_announcements,
)


class ChannelAnnouncements(commands.Cog):
    """Delivers durable announcement jobs to Discord channels."""

    name = "channel_announcements"

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def process_due(self) -> None:
        async with async_session() as session:
            await deliver_pending_channel_announcements(self.bot, session)
            await deliver_pending_announcement_reports(self.bot, session)

    async def next_due_at(self) -> datetime | None:
        async with async_session() as session:
            result = await session.execute(
                text(
                    """
                    SELECT MIN(due_at)
                    FROM (
                        SELECT MIN(available_at) AS due_at
                        FROM channel_announcement_outbox
                        WHERE status = 'pending'
                        UNION ALL
                        SELECT MIN(report_available_at) AS due_at
                        FROM channel_announcement_outbox
                        WHERE status = 'sent' AND report_status = 'pending'
                    ) scheduled
                    """
                )
            )
            return result.scalar_one_or_none()


async def setup(bot: commands.Bot) -> None:
    cog = ChannelAnnouncements(bot)
    await bot.add_cog(cog)
    register_scheduled_job(bot, cog)
