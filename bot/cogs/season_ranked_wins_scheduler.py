from __future__ import annotations

import aiohttp
from discord.ext import commands, tasks

from services.site_scheduler_client import (
    SiteSchedulerConfigurationError,
    post_site_scheduler_request,
)


class SeasonRankedWinsScheduler(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.refresh_registered_players.start()

    async def cog_unload(self) -> None:
        if self.refresh_registered_players.is_running():
            self.refresh_registered_players.cancel()

    @tasks.loop(minutes=10)
    async def refresh_registered_players(self) -> None:
        try:
            payload = await post_site_scheduler_request(
                "/api/internal/season/ranked-wins",
                timeout_seconds=300,
            )
            print(
                "✅ Рейтинговые победы участников обновлены: "
                f"{payload.get('refreshed', 0)}/{payload.get('checked', 0)}."
            )
        except SiteSchedulerConfigurationError as error:
            print(f"⚠️ {error}.")
        except (aiohttp.ClientError, TimeoutError, RuntimeError) as error:
            print(f"⚠️ Не удалось обновить рейтинговые победы: {error}")

    @refresh_registered_players.before_loop
    async def before_registered_players_refresh(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(SeasonRankedWinsScheduler(bot))
