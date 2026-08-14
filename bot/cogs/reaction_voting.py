import logging

import discord
from discord.ext import commands


log = logging.getLogger(__name__)

REACTION_VOTING_CHANNEL_ID = 1187341097719046214
REACTION_VOTING_EMOJIS = ("👎", "👍")


def is_reaction_voting_channel(channel: object) -> bool:
    """Return whether a channel is the voting channel or one of its forum threads."""
    return (
        getattr(channel, "id", None) == REACTION_VOTING_CHANNEL_ID
        or getattr(channel, "parent_id", None) == REACTION_VOTING_CHANNEL_ID
    )


class ReactionVoting(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _get_channel(self, channel_id: int):
        channel = self.bot.get_channel(channel_id)
        if channel is not None:
            return channel

        try:
            return await self.bot.fetch_channel(channel_id)
        except (discord.NotFound, discord.Forbidden, discord.HTTPException):
            log.warning("Не удалось получить канал голосования %s", channel_id)
            return None

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message) -> None:
        if not is_reaction_voting_channel(message.channel):
            return

        for emoji in REACTION_VOTING_EMOJIS:
            try:
                await message.add_reaction(emoji)
            except (discord.NotFound, discord.Forbidden, discord.HTTPException):
                log.warning(
                    "Не удалось добавить реакцию %s к сообщению %s",
                    emoji,
                    message.id,
                )

    @commands.Cog.listener()
    async def on_raw_reaction_add(
        self,
        payload: discord.RawReactionActionEvent,
    ) -> None:
        if str(payload.emoji) in REACTION_VOTING_EMOJIS:
            return

        channel = await self._get_channel(payload.channel_id)
        if channel is None or not is_reaction_voting_channel(channel):
            return

        try:
            message = await channel.fetch_message(payload.message_id)
            reaction_user = payload.member or discord.Object(id=payload.user_id)
            await message.remove_reaction(payload.emoji, reaction_user)
        except (discord.NotFound, discord.Forbidden, discord.HTTPException):
            log.warning(
                "Не удалось удалить реакцию %s пользователя %s с сообщения %s",
                payload.emoji,
                payload.user_id,
                payload.message_id,
            )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(ReactionVoting(bot))
