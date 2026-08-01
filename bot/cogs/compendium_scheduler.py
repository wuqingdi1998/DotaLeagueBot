from __future__ import annotations

import datetime
import os
from zoneinfo import ZoneInfo

import aiohttp
import discord
from discord.ext import commands, tasks
from sqlalchemy import text

from database.core import async_session

MOSCOW_TIME_ZONE = ZoneInfo("Europe/Moscow")
COMPENDIUM_GOLD_ROLE_NAME = "TI 2026 — Золотой компендиум"
COMPENDIUM_GOLD_ROLE_STARS = 75
AUTUMN_SEASON_NUMBER = 9


class CompendiumScheduler(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.generate_daily_quests.start()
        self.sync_gold_compendium_role.start()

    async def cog_unload(self) -> None:
        self.generate_daily_quests.cancel()
        self.sync_gold_compendium_role.cancel()

    async def request_daily_quests(self) -> None:
        secret = (
            os.getenv("COMPENDIUM_SCHEDULER_SECRET")
            or os.getenv("DISCORD_TOKEN")
            or ""
        ).strip()
        site_url = (
            os.getenv("COMPENDIUM_SITE_URL")
            or os.getenv("PUBLIC_BASE_URL")
            or ""
        ).rstrip("/")
        public_origin = (os.getenv("PUBLIC_BASE_URL") or site_url).rstrip("/")
        if len(secret) < 24 or not site_url:
            print("⚠️ Планировщик компендиума не настроен.")
            return

        timeout = aiohttp.ClientTimeout(total=15)
        headers = {
            "Authorization": f"Bearer {secret}",
            "Origin": public_origin,
        }
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    f"{site_url}/api/internal/compendium/generate",
                    headers=headers,
                ) as response:
                    if response.status != 200:
                        print(
                            "⚠️ Не удалось подготовить задания компендиума: "
                            f"HTTP {response.status}"
                        )
                        return
                    payload = await response.json()
                    print(
                        "✅ Задания компендиума подготовлены на "
                        f"{payload.get('moscowDate', 'текущий день')}."
                    )
        except (aiohttp.ClientError, TimeoutError) as error:
            print(f"⚠️ Сайт недоступен для планировщика компендиума: {error}")

    @tasks.loop(time=datetime.time(hour=0, minute=0, tzinfo=MOSCOW_TIME_ZONE))
    async def generate_daily_quests(self) -> None:
        await self.request_daily_quests()

    @generate_daily_quests.before_loop
    async def before_daily_generation(self) -> None:
        await self.bot.wait_until_ready()
        await self.request_daily_quests()

    async def eligible_gold_role_members(self) -> tuple[set[int], bool]:
        async with async_session() as session:
            season_started = bool(
                (
                    await session.execute(
                        text(
                            "SELECT EXISTS ("
                            "SELECT 1 FROM seasonal_league_sessions "
                            "WHERE season_number >= :season_number"
                            ")"
                        ),
                        {"season_number": AUTUMN_SEASON_NUMBER},
                    )
                ).scalar()
            )
            if season_started:
                return set(), True
            rows = await session.execute(
                text(
                    "SELECT player_id FROM compendium_user_quest_completions "
                    "GROUP BY player_id "
                    "HAVING SUM(reward_amount) >= :required_stars"
                ),
                {"required_stars": COMPENDIUM_GOLD_ROLE_STARS},
            )
            return {int(row.player_id) for row in rows}, False

    async def sync_guild_gold_role(self, guild: discord.Guild) -> None:
        eligible_ids, season_started = await self.eligible_gold_role_members()
        role = discord.utils.get(guild.roles, name=COMPENDIUM_GOLD_ROLE_NAME)
        if role is None and eligible_ids and not season_started:
            role = await guild.create_role(
                name=COMPENDIUM_GOLD_ROLE_NAME,
                colour=discord.Colour.gold(),
                hoist=True,
                reason="Награда за 75 звёзд компендиума TI 2026",
            )
            if guild.me and guild.me.top_role.position > 1:
                await role.edit(position=guild.me.top_role.position - 1)
        if role is None:
            return
        current_ids = {member.id for member in role.members}
        for member_id in current_ids - eligible_ids:
            member = guild.get_member(member_id)
            if member:
                await member.remove_roles(
                    role,
                    reason="Завершение награды компендиума TI 2026",
                )
        for member_id in eligible_ids - current_ids:
            member = guild.get_member(member_id)
            if member is None:
                try:
                    member = await guild.fetch_member(member_id)
                except discord.NotFound:
                    continue
            await member.add_roles(
                role,
                reason="Награда за 75 звёзд компендиума TI 2026",
            )

    @tasks.loop(minutes=5)
    async def sync_gold_compendium_role(self) -> None:
        guild_id = int(os.getenv("GUILD_ID") or 0)
        guilds = [self.bot.get_guild(guild_id)] if guild_id else self.bot.guilds
        for guild in guilds:
            if guild is None:
                continue
            try:
                await self.sync_guild_gold_role(guild)
            except (discord.Forbidden, discord.HTTPException) as error:
                print(f"⚠️ Не удалось обновить золотую роль компендиума: {error}")

    @sync_gold_compendium_role.before_loop
    async def before_gold_role_sync(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(CompendiumScheduler(bot))
