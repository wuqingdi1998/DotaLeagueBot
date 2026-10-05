from __future__ import annotations

import datetime
import os

import discord
from discord.ext import commands, tasks

from database.core import async_session
from services.october_server_membership import (
    record_october_server_membership,
    sync_october_server_membership,
)
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

    def _compendium_guild(self) -> discord.Guild | None:
        configured_id = os.getenv("GUILD_ID")
        if configured_id:
            return self.bot.get_guild(int(configured_id))
        return self.bot.guilds[0] if len(self.bot.guilds) == 1 else None

    @commands.Cog.listener()
    async def on_member_remove(self, member: discord.Member) -> None:
        if member.guild == self._compendium_guild():
            async with async_session() as session:
                await record_october_server_membership(session, member.id, False)

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member) -> None:
        if member.guild == self._compendium_guild():
            async with async_session() as session:
                await record_october_server_membership(session, member.id, True)

    @tasks.loop(minutes=5)
    async def sync_roles(self) -> None:
        now = datetime.datetime.now(MOSCOW_TIME_ZONE)
        guild = self._compendium_guild()
        if guild is None or guild.unavailable:
            return
        # Fetch the complete list: missing cache entries do not prove someone left.
        snapshot_started_at = datetime.datetime.now(datetime.timezone.utc)
        try:
            members = [member async for member in guild.fetch_members(limit=None)]
        except discord.HTTPException as error:
            print(f"[OCTOBER SERVER] Member list unavailable: {error}", flush=True)
            return
        if self.bot.user is None or not any(member.id == self.bot.user.id for member in members):
            print("[OCTOBER SERVER] Incomplete member list; cleanup skipped", flush=True)
            return
        excluded_player_ids = [
            member.id
            for member in members
            if any(
                role.name.strip().casefold() == COMPENDIUM_EXCLUDED_ROLE_NAME.casefold()
                for role in member.roles
            )
        ]
        async with async_session() as session:
            absent_count = await sync_october_server_membership(
                session, [member.id for member in members], snapshot_started_at,
            )
            assignments = await load_clan_assignments(session, excluded_player_ids)
        print(f"[OCTOBER SERVER] Membership checked; absent players: {absent_count}", flush=True)
        try:
            if now >= ROLE_REMOVAL_AT:
                await delete_clan_roles(guild)
            else:
                await sync_clan_roles(guild, assignments, members=members)
        except (discord.Forbidden, discord.HTTPException, RuntimeError) as error:
            print(f"⚠️ Не удалось синхронизировать роли кланов: {error}")

    @sync_roles.before_loop
    async def before_sync(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(OctoberCompendiumRoles(bot))
