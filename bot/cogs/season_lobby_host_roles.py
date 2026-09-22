from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from discord.ext import commands
from sqlalchemy import text

from database.core import async_session
from services.durable_scheduler import register_scheduled_job
from services.season_lobby_host_roles import sync_season_lobby_host_roles


class SeasonLobbyHostRoles(commands.Cog):
    name = "season_lobby_host_roles"

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def process_due(self) -> None:
        guild_id = os.getenv("GUILD_ID")
        if not guild_id:
            return
        async with async_session() as session:
            await sync_season_lobby_host_roles(self.bot, session, int(guild_id))

    async def next_due_at(self) -> datetime | None:
        if not os.getenv("GUILD_ID"):
            return None
        async with async_session() as session:
            result = await session.execute(
                text("SELECT EXISTS (SELECT 1 FROM season_lobby_host_role_members)")
            )
            if result.scalar_one():
                poll_at = datetime.now(timezone.utc) + timedelta(seconds=30)
                expiry = await session.execute(
                    text(
                        """
                        SELECT MIN(match.host_role_expires_at)
                        FROM season_matches AS match
                        JOIN season_lobby_host_role_members AS member
                          ON member.player_id = match.host_player_id
                        WHERE match.status = 'completed'
                          AND match.host_role_expires_at > NOW()
                        """
                    )
                )
                next_expiry = expiry.scalar_one_or_none()
                return min(poll_at, next_expiry) if next_expiry else poll_at
            return None


async def setup(bot: commands.Bot) -> None:
    cog = SeasonLobbyHostRoles(bot)
    await bot.add_cog(cog)
    register_scheduled_job(bot, cog)
