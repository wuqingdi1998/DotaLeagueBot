from __future__ import annotations

from discord.ext import commands, tasks

from services.compendium_lifecycle import is_current_compendium_active
from services.site_scheduler_client import post_site_scheduler_request


class CompendiumMaintenance(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.maintain_compendium.start()

    async def cog_unload(self) -> None:
        self.maintain_compendium.cancel()

    @tasks.loop(minutes=5)
    async def maintain_compendium(self) -> None:
        paths = ["/api/internal/compendium/restore-evidence"]
        if is_current_compendium_active():
            paths += ["/api/internal/compendium/generate", "/api/internal/compendium/verify-arcana"]
        for path in paths:
            try:
                await post_site_scheduler_request(path, timeout_seconds=300)
            except Exception as error:
                print(f"⚠️ Не удалось обслужить текущий компендиум ({path}): {error}")

    @maintain_compendium.before_loop
    async def before_maintenance(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(CompendiumMaintenance(bot))
