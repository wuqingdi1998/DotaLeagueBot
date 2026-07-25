from __future__ import annotations

import asyncio
import os

import discord
from discord.ext import commands, tasks
from sqlalchemy import text

from database.core import async_session
from utils.website_notifications import notification_embed


class WebsiteBridge(commands.Cog):
    """Delivers website events through the existing Discord bot."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.deliver_notifications.start()

    async def cog_unload(self) -> None:
        self.deliver_notifications.cancel()

    @tasks.loop(seconds=15)
    async def deliver_notifications(self) -> None:
        async with async_session() as session:
            result = await session.execute(
                text(
                    """
                    SELECT id, discord_id, title, message, action_url
                    FROM notification_outbox
                    WHERE status = 'pending' AND available_at <= NOW()
                    ORDER BY id
                    FOR UPDATE SKIP LOCKED
                    LIMIT 20
                    """
                )
            )
            notifications = result.mappings().all()
            for notification in notifications:
                try:
                    user = self.bot.get_user(notification["discord_id"])
                    if user is None:
                        user = await self.bot.fetch_user(notification["discord_id"])
                    await user.send(
                        embed=notification_embed(
                            notification["title"],
                            notification["message"],
                            notification["action_url"],
                        )
                    )
                    await session.execute(
                        text(
                            """
                            UPDATE notification_outbox
                            SET status = 'sent', sent_at = NOW(), attempts = attempts + 1
                            WHERE id = :id
                            """
                        ),
                        {"id": notification["id"]},
                    )
                except (discord.Forbidden, discord.NotFound) as error:
                    await session.execute(
                        text(
                            """
                            UPDATE notification_outbox
                            SET status = 'failed', attempts = attempts + 1,
                                last_error = :error
                            WHERE id = :id
                            """
                        ),
                        {"id": notification["id"], "error": str(error)[:1000]},
                    )
                except (discord.HTTPException, asyncio.TimeoutError) as error:
                    await session.execute(
                        text(
                            """
                            UPDATE notification_outbox
                            SET attempts = attempts + 1,
                                available_at = NOW() + INTERVAL '5 minutes',
                                last_error = :error,
                                status = CASE WHEN attempts >= 4 THEN 'failed' ELSE 'pending' END
                            WHERE id = :id
                            """
                        ),
                        {"id": notification["id"], "error": str(error)[:1000]},
                    )
            await session.commit()

    @deliver_notifications.before_loop
    async def before_delivery(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot) -> None:
    if os.getenv("WEBSITE_NOTIFICATIONS_ENABLED", "true").lower() == "true":
        await bot.add_cog(WebsiteBridge(bot))
