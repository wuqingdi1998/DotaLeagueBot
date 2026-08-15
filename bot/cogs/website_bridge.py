from __future__ import annotations

import asyncio
import os

import discord
from discord.ext import commands, tasks
from sqlalchemy.engine import RowMapping
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database.core import async_session
from utils.website_notifications import notification_embed


class WebsiteBridge(commands.Cog):
    """Delivers website events through the existing Discord bot."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.deliver_notifications.start()

    async def cog_unload(self) -> None:
        self.deliver_notifications.cancel()

    async def _delete_notification_message(
        self, user: discord.User, notification: RowMapping
    ) -> None:
        channel = user.dm_channel or await user.create_dm()
        message_id = notification["discord_message_id"]
        if message_id is not None:
            try:
                message = await channel.fetch_message(int(message_id))
            except discord.NotFound:
                return
            await message.delete()
            return

        if self.bot.user is None:
            return
        async for message in channel.history(limit=200):
            if message.author.id != self.bot.user.id:
                continue
            if any(
                embed.title == notification["title"]
                and embed.description == notification["message"]
                for embed in message.embeds
            ):
                await message.delete()
                return

    async def _queue_tournament_checkins(self, session: AsyncSession) -> None:
        base_url = (os.getenv("PUBLIC_BASE_URL") or "https://lsesports.ru").rstrip("/")
        await session.execute(
            text(
                """
                WITH tournament_starts AS (
                    SELECT tournament_id, MIN(scheduled_at) AS first_match_at
                    FROM tournament_matches
                    GROUP BY tournament_id
                )
                INSERT INTO notification_outbox (
                    discord_id, event_type, title, message, action_url,
                    application_id
                )
                SELECT application.captain_discord_id,
                       'tournament_check_in',
                       'Чек-ин турнира: ' || tournament.name,
                       'Капитан, подтвердите участие команды «'
                           || application.team_name || '» в турнире. '
                           || 'Одного подтверждения достаточно для всей команды.',
                       :base_url || '/tournaments/' || tournament.slug,
                       application.id
                FROM tournament_team_applications application
                JOIN tournaments tournament
                  ON tournament.id = application.tournament_id
                JOIN tournament_starts start_time
                  ON start_time.tournament_id = tournament.id
                WHERE application.status = 'approved'
                  AND application.captain_discord_id IS NOT NULL
                  AND tournament.status IN ('registration', 'active')
                  AND NOW() >= start_time.first_match_at
                      - (tournament.check_in_minutes || ' minutes')::interval
                  AND NOW() < start_time.first_match_at
                ON CONFLICT DO NOTHING
                """
            ),
            {"base_url": base_url},
        )

    @tasks.loop(seconds=15)
    async def deliver_notifications(self) -> None:
        async with async_session() as session:
            await self._queue_tournament_checkins(session)
            result = await session.execute(
                text(
                    """
                    SELECT id, discord_id, title, message, action_url,
                           status, discord_message_id
                    FROM notification_outbox
                    WHERE status IN ('pending', 'delete_pending')
                      AND available_at <= NOW()
                    ORDER BY CASE WHEN status = 'delete_pending' THEN 0 ELSE 1 END, id
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
                    if notification["status"] == "delete_pending":
                        await self._delete_notification_message(user, notification)
                        await session.execute(
                            text(
                                """
                                UPDATE notification_outbox
                                SET status = 'deleted', attempts = attempts + 1,
                                    last_error = NULL
                                WHERE id = :id
                                """
                            ),
                            {"id": notification["id"]},
                        )
                    else:
                        sent_message = await user.send(
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
                                SET status = 'sent', sent_at = NOW(),
                                    attempts = attempts + 1,
                                    discord_message_id = :message_id
                                WHERE id = :id
                                """
                            ),
                            {
                                "id": notification["id"],
                                "message_id": sent_message.id,
                            },
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
                                status = CASE
                                    WHEN attempts >= 4 THEN 'failed'
                                    ELSE :retry_status
                                END
                            WHERE id = :id
                            """
                        ),
                        {
                            "id": notification["id"],
                            "error": str(error)[:1000],
                            "retry_status": notification["status"],
                        },
                    )
            await session.commit()

    @deliver_notifications.before_loop
    async def before_delivery(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot) -> None:
    if os.getenv("WEBSITE_NOTIFICATIONS_ENABLED", "true").lower() == "true":
        await bot.add_cog(WebsiteBridge(bot))
