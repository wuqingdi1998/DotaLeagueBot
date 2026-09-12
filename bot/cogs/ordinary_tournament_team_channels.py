from __future__ import annotations

from datetime import datetime

from discord.ext import commands

from database.core import async_session
from services.durable_scheduler import register_scheduled_job
from services.ordinary_tournament_team_channel_sync import (
    next_ordinary_tournament_team_channel_change_at,
    sync_ordinary_tournament_team_channels,
)


class OrdinaryTournamentTeamChannels(commands.Cog):
    """Keeps private team voice channels aligned with ordinary tournaments."""

    name = "ordinary_tournament_team_channels"

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def process_due(self) -> None:
        async with async_session() as session:
            failure_count = await sync_ordinary_tournament_team_channels(
                self.bot,
                session,
            )
        if failure_count:
            raise RuntimeError(
                f"Could not synchronize {failure_count} tournament team channel(s)"
            )

    async def next_due_at(self) -> datetime | None:
        async with async_session() as session:
            return await next_ordinary_tournament_team_channel_change_at(session)


async def setup(bot: commands.Bot) -> None:
    cog = OrdinaryTournamentTeamChannels(bot)
    await bot.add_cog(cog)
    register_scheduled_job(bot, cog)
