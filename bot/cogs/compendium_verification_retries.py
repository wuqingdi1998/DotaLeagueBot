from datetime import datetime

from discord.ext import commands

from services.compendium_verification_retries import next_verification_due_at, process_verification_retries
from services.durable_scheduler import register_scheduled_job


class CompendiumVerificationRetries(commands.Cog):
    name = "compendium_verification_retries"

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def process_due(self) -> None:
        await process_verification_retries(self.bot)

    async def next_due_at(self) -> datetime | None:
        return await next_verification_due_at()


async def setup(bot: commands.Bot) -> None:
    cog = CompendiumVerificationRetries(bot)
    await bot.add_cog(cog)
    register_scheduled_job(bot, cog)
