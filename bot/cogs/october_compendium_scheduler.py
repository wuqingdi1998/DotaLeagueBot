from __future__ import annotations

import asyncio
import datetime
from zoneinfo import ZoneInfo

from discord.ext import commands, tasks

from services.site_scheduler_client import (
    SiteSchedulerConfigurationError,
    post_site_scheduler_request,
)


MOSCOW_TIME_ZONE = ZoneInfo("Europe/Moscow")
FORMATION_START = datetime.datetime(
    2026,
    10,
    4,
    23,
    50,
    tzinfo=MOSCOW_TIME_ZONE,
)
FORMATION_RETRY_END = datetime.datetime(
    2026,
    10,
    5,
    0,
    30,
    tzinfo=MOSCOW_TIME_ZONE,
)


class OctoberCompendiumScheduler(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.is_complete = False
        self.request_lock = asyncio.Lock()
        self.start_formation.start()
        self.retry_formation.start()

    async def cog_unload(self) -> None:
        self.start_formation.cancel()
        self.retry_formation.cancel()

    async def request_formation(self) -> None:
        if self.request_lock.locked():
            return
        async with self.request_lock:
            try:
                payload = await post_site_scheduler_request(
                    "/api/internal/compendium-october/form-clans",
                    timeout_seconds=600,
                )
            except SiteSchedulerConfigurationError:
                print("⚠️ Формирование октябрьских кланов не настроено.")
                return
            except Exception as error:
                print(f"⚠️ Не удалось сформировать октябрьские кланы: {error}")
                return
            if payload.get("status") == "complete":
                self.is_complete = True
                print(
                    "✅ Октябрьские кланы сформированы. "
                    f"Участников: {payload.get('playerCount', 0)}."
                )

    @tasks.loop(
        time=datetime.time(hour=23, minute=50, tzinfo=MOSCOW_TIME_ZONE)
    )
    async def start_formation(self) -> None:
        if datetime.datetime.now(MOSCOW_TIME_ZONE).date() != FORMATION_START.date():
            return
        await self.request_formation()

    @start_formation.before_loop
    async def before_start_formation(self) -> None:
        await self.bot.wait_until_ready()

    @tasks.loop(seconds=30)
    async def retry_formation(self) -> None:
        if self.is_complete:
            self.retry_formation.cancel()
            return
        now = datetime.datetime.now(MOSCOW_TIME_ZONE)
        if now < FORMATION_START:
            return
        if now >= FORMATION_RETRY_END:
            self.retry_formation.cancel()
            return
        await self.request_formation()

    @retry_formation.before_loop
    async def before_retry_formation(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(OctoberCompendiumScheduler(bot))
