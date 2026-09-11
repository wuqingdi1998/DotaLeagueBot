from __future__ import annotations

from datetime import datetime

from discord.ext import commands

from services.durable_scheduler import register_scheduled_job
from services.site_scheduler_client import post_site_scheduler_request


class FearlessDraftDeadlines(commands.Cog):
    """Runs persisted Fearless Draft deadlines without interval polling."""

    name = "fearless_draft_deadlines"

    def __init__(self) -> None:
        self._next_due_at: datetime | None = None

    async def process_due(self) -> None:
        result = await post_site_scheduler_request(
            "/api/internal/fearless-draft/deadlines",
            timeout_seconds=60,
        )
        next_due_at = result.get("nextDueAt")
        self._next_due_at = (
            datetime.fromisoformat(next_due_at)
            if isinstance(next_due_at, str)
            else None
        )

    async def next_due_at(self) -> datetime | None:
        return self._next_due_at


async def setup(bot: commands.Bot) -> None:
    cog = FearlessDraftDeadlines()
    await bot.add_cog(cog)
    register_scheduled_job(bot, cog)
