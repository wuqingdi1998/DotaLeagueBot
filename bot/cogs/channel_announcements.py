from __future__ import annotations

from discord.ext import commands, tasks

from database.core import async_session
from services.channel_announcement_delivery import (
    deliver_pending_announcement_reports,
    deliver_pending_channel_announcements,
)


class ChannelAnnouncements(commands.Cog):
    """Delivers durable announcement jobs to Discord channels."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.deliver_announcements.start()

    async def cog_unload(self) -> None:
        self.deliver_announcements.cancel()

    @tasks.loop(seconds=15)
    async def deliver_announcements(self) -> None:
        async with async_session() as session:
            await deliver_pending_channel_announcements(self.bot, session)
            await deliver_pending_announcement_reports(self.bot, session)

    @deliver_announcements.before_loop
    async def before_delivery(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(ChannelAnnouncements(bot))
