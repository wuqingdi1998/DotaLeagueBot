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
PREPARATION_START = datetime.datetime(
    2026,
    10,
    4,
    23,
    30,
    tzinfo=MOSCOW_TIME_ZONE,
)
PUBLICATION_START = datetime.datetime(
    2026,
    10,
    5,
    0,
    0,
    tzinfo=MOSCOW_TIME_ZONE,
)
PUBLICATION_RETRY_END = datetime.datetime(
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
        self.is_prepared = False
        self.is_finished = False
        self.request_lock = asyncio.Lock()
        self.run_schedule.start()

    async def cog_unload(self) -> None:
        self.run_schedule.cancel()

    async def request_site(self, path: str) -> dict[str, object] | None:
        if self.request_lock.locked():
            return None
        async with self.request_lock:
            try:
                return await post_site_scheduler_request(path, timeout_seconds=600)
            except SiteSchedulerConfigurationError:
                print("⚠️ Управляемый запуск октябрьского Компендиума не настроен.")
            except Exception as error:
                print(f"⚠️ Не удалось выполнить этап запуска Компендиума: {error}")
        return None

    async def prepare_report(self) -> None:
        payload = await self.request_site(
            "/api/internal/compendium-october/prepare-launch"
        )
        if payload and payload.get("status") == "ready":
            self.is_prepared = True
            print(
                "✅ Отчёт по распределению октябрьских кланов готов. "
                f"Участников: {payload.get('playerCount', 0)}."
            )

    async def publish_approved_launch(self) -> None:
        payload = await self.request_site(
            "/api/internal/compendium-october/publish-launch"
        )
        if payload and payload.get("status") in {"published", "cancelled"}:
            self.is_finished = True
            print(f"✅ Решение по запуску Компендиума: {payload.get('status')}.")

    @tasks.loop(seconds=30)
    async def run_schedule(self) -> None:
        if self.is_finished:
            self.run_schedule.cancel()
            return
        now = datetime.datetime.now(MOSCOW_TIME_ZONE)
        if now < PREPARATION_START:
            return
        if not self.is_prepared:
            await self.prepare_report()
            return
        if now < PUBLICATION_START:
            return
        if now >= PUBLICATION_RETRY_END:
            self.run_schedule.cancel()
            return
        await self.publish_approved_launch()

    @run_schedule.before_loop
    async def before_run_schedule(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(OctoberCompendiumScheduler(bot))
