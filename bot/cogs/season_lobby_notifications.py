from __future__ import annotations

from discord.ext import commands, tasks

from database.core import async_session
from services.season_lobby_notifications import (
    deliver_due_season_lobby_notifications,
)


class SeasonLobbyNotifications(commands.Cog):
    """Delivers scheduled season lobby details to hosts and players."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.deliver_notifications.start()

    async def cog_unload(self) -> None:
        self.deliver_notifications.cancel()

    @tasks.loop(seconds=5)
    async def deliver_notifications(self) -> None:
        async with async_session() as session:
            await deliver_due_season_lobby_notifications(self.bot, session)

    @deliver_notifications.before_loop
    async def before_delivery(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(SeasonLobbyNotifications(bot))
