from __future__ import annotations

import datetime
import os
from zoneinfo import ZoneInfo

import aiohttp
from discord.ext import commands, tasks

MOSCOW_TIME_ZONE = ZoneInfo("Europe/Moscow")


class CompendiumScheduler(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.generate_daily_quests.start()

    async def cog_unload(self) -> None:
        self.generate_daily_quests.cancel()

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


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(CompendiumScheduler(bot))
