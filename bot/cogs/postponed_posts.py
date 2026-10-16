import json
import logging

import discord
from discord import app_commands
from discord.ext import commands
from sqlalchemy import text

from database.core import async_session
from services.announcement_delivery import send_announcement
from services.durable_scheduler import register_scheduled_job
from services.postponed_posts import cancel_guild_posts, decode_files, lock_guild_queue


logger = logging.getLogger(__name__)


class PostponedPosts(commands.Cog):
    name = "postponed_posts"

    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="postponed_del", description="[Admin] Удалить все ожидающие посты этого сервера")
    @app_commands.guild_only()
    @app_commands.checks.has_permissions(administrator=True)
    async def postponed_del(self, interaction: discord.Interaction):
        if interaction.guild_id is None:
            await interaction.response.send_message("Команда доступна только на сервере.", ephemeral=True)
            return
        await interaction.response.defer(ephemeral=True)
        async with async_session() as session:
            count = await cancel_guild_posts(session, interaction.guild_id)
        await interaction.followup.send(f"✅ Удалено отложенных постов: {count}.", ephemeral=True)

    async def next_due_at(self):
        async with async_session() as session:
            return await session.scalar(text(
                "SELECT MIN(scheduled_at) FROM postponed_posts WHERE status = 'pending'"
            ))

    async def process_due(self):
        async with async_session() as session:
            result = await session.execute(text("""
                SELECT id, guild_id FROM postponed_posts
                WHERE status = 'pending' AND scheduled_at <= NOW()
                ORDER BY scheduled_at, id LIMIT 25
            """))
            posts = result.mappings().all()
        for post in posts:
            await self._publish(post["id"], post["guild_id"])

    async def _publish(self, post_id, guild_id):
        async with async_session() as session:
            await lock_guild_queue(session, guild_id)
            result = await session.execute(text("""
                SELECT * FROM postponed_posts WHERE id = :id AND status = 'pending'
                  AND scheduled_at <= NOW() FOR UPDATE
            """), {"id": post_id})
            post = result.mappings().first()
            if post is None:
                return
            try:
                channel = self.bot.get_channel(post["channel_id"])
                if channel is None:
                    channel = await self.bot.fetch_channel(post["channel_id"])
                if not isinstance(channel, discord.TextChannel) or channel.guild.id != guild_id:
                    raise ValueError("Post channel is unavailable")
                payload = post["payload"]
                if isinstance(payload, str):
                    payload = json.loads(payload)
                embed = discord.Embed.from_dict(payload["embed"]) if payload["embed"] else None
                await send_announcement(
                    channel, payload["username"], payload["avatar_url"], payload["mentions"],
                    payload["proc_text"], embed, decode_files(payload),
                )
            except Exception as error:
                # A multi-part post may be partially delivered; automatic retries could duplicate it.
                status = "failed"
                logger.error("Postponed post %s failed (%s)", post_id, type(error).__name__)
            else:
                status = "sent"
            await session.execute(text("""
                UPDATE postponed_posts SET status = :status, payload = '{}'::jsonb
                WHERE id = :id
            """), {"id": post_id, "status": status})
            await session.commit()


async def setup(bot):
    cog = PostponedPosts(bot)
    await bot.add_cog(cog)
    register_scheduled_job(bot, cog)
