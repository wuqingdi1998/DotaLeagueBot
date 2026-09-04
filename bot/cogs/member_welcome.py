from __future__ import annotations

import logging
import os

import discord
from discord.ext import commands

from services.member_welcome import send_member_welcome


LOGGER = logging.getLogger(__name__)


def should_send_member_welcome(
    member: discord.Member,
    configured_guild_id: str | None,
) -> bool:
    if member.bot or configured_guild_id is None:
        return False
    return member.guild.id == int(configured_guild_id)


class MemberWelcome(commands.Cog):
    """Welcomes new human members in a direct message."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member) -> None:
        if not should_send_member_welcome(member, os.getenv("GUILD_ID")):
            return
        try:
            await send_member_welcome(member)
        except discord.Forbidden:
            LOGGER.info("New member %s does not accept direct messages", member.id)
        except discord.HTTPException as error:
            LOGGER.warning(
                "Could not welcome new member %s: %s",
                member.id,
                error,
            )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(MemberWelcome(bot))
