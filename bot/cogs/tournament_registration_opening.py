from __future__ import annotations

from datetime import datetime

from discord.ext import commands

from database.core import async_session
from services.durable_scheduler import register_scheduled_job
from services.tournament_registration_opening import (
    next_registration_opening_at,
    open_due_tournament_registrations,
)


class TournamentRegistrationOpening(commands.Cog):
    """Opens tournament registration at the organizer's saved time."""

    name = "tournament_registration_opening"

    async def process_due(self) -> None:
        async with async_session() as session:
            opened_count = await open_due_tournament_registrations(session)
        if opened_count:
            print(f"[SCHEDULER] Opened registration for {opened_count} tournament(s).")

    async def next_due_at(self) -> datetime | None:
        async with async_session() as session:
            return await next_registration_opening_at(session)


async def setup(bot: commands.Bot) -> None:
    cog = TournamentRegistrationOpening()
    await bot.add_cog(cog)
    register_scheduled_job(bot, cog)
