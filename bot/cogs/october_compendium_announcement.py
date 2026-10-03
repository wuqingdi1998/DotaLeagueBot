from __future__ import annotations

import os
from datetime import datetime

import discord
from discord.ext import commands
from sqlalchemy.exc import SQLAlchemyError

from database.core import async_session
from services.durable_scheduler import register_scheduled_job
from services.october_compendium_announcement_campaign import (
    deliver_due_batch,
    next_campaign_due_at,
    prepare_due_campaign,
)


class OctoberCompendiumAnnouncement(commands.Cog):
    name = "october_compendium_announcement"

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def process_due(self) -> None:
        guild_id = os.getenv("GUILD_ID")
        if not guild_id:
            return
        try:
            async with async_session() as session:
                await prepare_due_campaign(self.bot, session, int(guild_id))
                await deliver_due_batch(self.bot, session)
        except (SQLAlchemyError, discord.HTTPException, OSError, ValueError) as error:
            print(f"[OCTOBER COMPENDIUM ANNOUNCEMENT] Failed: {error}")
            raise

    async def next_due_at(self) -> datetime | None:
        if not os.getenv("GUILD_ID"):
            return None
        async with async_session() as session:
            return await next_campaign_due_at(session)


async def setup(bot: commands.Bot) -> None:
    cog = OctoberCompendiumAnnouncement(bot)
    register_scheduled_job(bot, cog)
    await bot.add_cog(cog)
