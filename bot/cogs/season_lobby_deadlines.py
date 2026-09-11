from __future__ import annotations

from datetime import datetime

from discord.ext import commands
from sqlalchemy import text

from database.core import async_session
from services.durable_scheduler import register_scheduled_job
from services.site_scheduler_client import post_site_scheduler_request


class SeasonLobbyDeadlines(commands.Cog):
    """Advances persisted captain-selection stages at their exact deadline."""

    name = "season_lobby_deadlines"

    async def process_due(self) -> None:
        await post_site_scheduler_request(
            "/api/internal/season/captain-deadlines",
            timeout_seconds=60,
        )

    async def next_due_at(self) -> datetime | None:
        async with async_session() as session:
            result = await session.execute(
                text(
                    """
                    SELECT MIN(captain_stage_deadline_at)
                    FROM season_match_rooms
                    WHERE status IN (
                        'captain_interest',
                        'captain_voting',
                        'captain_tiebreak'
                    )
                      AND captain_stage_deadline_at IS NOT NULL
                    """
                )
            )
            return result.scalar_one_or_none()


async def setup(bot: commands.Bot) -> None:
    cog = SeasonLobbyDeadlines()
    await bot.add_cog(cog)
    register_scheduled_job(bot, cog)
