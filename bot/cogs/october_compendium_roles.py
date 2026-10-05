from __future__ import annotations

import datetime

import discord
from discord.ext import commands, tasks

from database.core import async_session
from utils.subscription_roles import COMPENDIUM_EXCLUDED_ROLE_NAME
from services.october_compendium_roles import (
    ROLE_REMOVAL_AT,
    delete_clan_roles,
    load_clan_assignments,
    sync_clan_roles,
)


MOSCOW_TIME_ZONE = datetime.timezone(datetime.timedelta(hours=3), name="Europe/Moscow")


class OctoberCompendiumRoles(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.sync_roles.start()

    async def cog_unload(self) -> None:
        self.sync_roles.cancel()

    @tasks.loop(minutes=5)
    async def sync_roles(self) -> None:
        now = datetime.datetime.now(MOSCOW_TIME_ZONE)
        excluded_player_ids = [
            member.id
            for guild in self.bot.guilds
            for member in guild.members
            if any(
                role.name.strip().casefold() == COMPENDIUM_EXCLUDED_ROLE_NAME.casefold()
                for role in member.roles
            )
        ]
        async with async_session() as session:
            assignments = await load_clan_assignments(session, excluded_player_ids)
        for guild in self.bot.guilds:
            try:
                if now >= ROLE_REMOVAL_AT:
                    await delete_clan_roles(guild)
                else:
                    await sync_clan_roles(guild, assignments)
            except (discord.Forbidden, discord.HTTPException, RuntimeError) as error:
                print(f"⚠️ Не удалось синхронизировать роли кланов: {error}")

    @sync_roles.before_loop
    async def before_sync(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(OctoberCompendiumRoles(bot))
