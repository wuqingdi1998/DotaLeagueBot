from __future__ import annotations

import os

import discord
from discord.ext import commands, tasks
from sqlalchemy.exc import SQLAlchemyError

from database.core import async_session
from services.season_nine_outreach import (
    deliver_due_outreach_batch,
    prepare_due_outreach_campaign,
    send_completed_outreach_report,
)


class SeasonNineOutreach(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.process_campaign.start()

    async def cog_unload(self) -> None:
        if self.process_campaign.is_running():
            self.process_campaign.cancel()

    @tasks.loop(seconds=2)
    async def process_campaign(self) -> None:
        guild_id = os.getenv("GUILD_ID")
        if not guild_id:
            return
        try:
            async with async_session() as session:
                await prepare_due_outreach_campaign(
                    self.bot,
                    session,
                    int(guild_id),
                )
                await deliver_due_outreach_batch(self.bot, session)
                await send_completed_outreach_report(self.bot, session)
        except (
            SQLAlchemyError,
            discord.HTTPException,
            OSError,
            TypeError,
            ValueError,
        ) as error:
            print(f"[SEASON OUTREACH] Campaign processing failed: {error}")

    @process_campaign.before_loop
    async def before_campaign(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(SeasonNineOutreach(bot))
