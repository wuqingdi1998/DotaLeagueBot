from __future__ import annotations

import asyncio
import os

import discord
from discord.ext import commands, tasks
from sqlalchemy.engine import RowMapping
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database.core import async_session
from services.season_round_discord_channel import (
    SeasonRoundDiscordChannelTarget,
    delete_season_round_discord_channel,
    ensure_season_round_discord_channel,
    resolve_live_events_category,
)
from utils.website_notifications import notification_embed


LIVE_EVENTS_CATEGORY_ID = int(
    os.getenv("LIVE_EVENTS_CATEGORY_ID") or "1211809315464159242"
)


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

    async def _queue_season_round_checkins(self, session: AsyncSession) -> None:
        base_url = (os.getenv("PUBLIC_BASE_URL") or "https://lsesports.ru").rstrip("/")
        await session.execute(
            text(
                """
                INSERT INTO notification_outbox (
                    discord_id, event_type, title, message, action_url,
                    season_round_id
                )
                SELECT registration.player_id,
                       'season_round_check_in_open',
                       'Чек-ин стартовал!',
                       'Подтвердите участие в туре «'
                           || COALESCE(round.name, 'Тур ' || round.round_number)
                           || '». Чек-ин закроется за 10 минут до начала.',
                       :base_url || '/tournaments/' || tournament.slug
                           || '?round=' || round.round_number,
                       round.id
                FROM season_round_registrations registration
                JOIN season_rounds round ON round.id = registration.round_id
                JOIN tournaments tournament
                  ON tournament.id = round.tournament_id
                LEFT JOIN season_round_checkins checkin
                  ON checkin.round_id = registration.round_id
                 AND checkin.player_id = registration.player_id
                WHERE round.round_kind = 'regular'
                  AND round.is_visible = TRUE
                  AND round.status IN ('planned', 'active')
                  AND tournament.status IN ('registration', 'active')
                  AND NOW() >= round.scheduled_at - INTERVAL '2 hours'
                  AND NOW() < round.scheduled_at - INTERVAL '10 minutes'
                  AND checkin.player_id IS NULL
                ON CONFLICT (discord_id, season_round_id, event_type)
                  WHERE season_round_id IS NOT NULL
                DO NOTHING
                """
            ),
            {"base_url": base_url},
        )

    async def _queue_season_round_missing_checkins(
        self, session: AsyncSession
    ) -> None:
        base_url = (os.getenv("PUBLIC_BASE_URL") or "https://lsesports.ru").rstrip("/")
        await session.execute(
            text(
                """
                INSERT INTO notification_outbox (
                    discord_id, event_type, title, message, action_url,
                    season_round_id
                )
                SELECT organizer.discord_id,
                       'season_round_check_in_missing',
                       'Чек-ин закрыт: '
                           || COALESCE(round.name, 'Тур ' || round.round_number),
                       CASE
                         WHEN missing.players IS NULL
                           THEN 'Все зарегистрированные участники прошли чек-ин.'
                         ELSE 'Не прошли чек-ин:' || E'\n' || missing.players
                       END,
                       :base_url || '/tournaments/' || tournament.slug
                           || '?round=' || round.round_number,
                       round.id
                FROM season_rounds round
                JOIN tournaments tournament
                  ON tournament.id = round.tournament_id
                JOIN tournament_organizers organizer
                  ON organizer.tournament_id = tournament.id
                LEFT JOIN LATERAL (
                    SELECT STRING_AGG('• ' || player.ingame_name, E'\n'
                                      ORDER BY LOWER(player.ingame_name)) AS players
                    FROM season_round_registrations registration
                    JOIN players player ON player.discord_id = registration.player_id
                    LEFT JOIN season_round_checkins checkin
                      ON checkin.round_id = registration.round_id
                     AND checkin.player_id = registration.player_id
                    WHERE registration.round_id = round.id
                      AND checkin.player_id IS NULL
                ) missing ON TRUE
                WHERE round.round_kind = 'regular'
                  AND round.is_visible = TRUE
                  AND round.status IN ('planned', 'active')
                  AND tournament.status IN ('registration', 'active')
                  AND NOW() >= round.scheduled_at - INTERVAL '10 minutes'
                  AND NOW() < round.scheduled_at + INTERVAL '6 hours'
                ON CONFLICT (discord_id, season_round_id, event_type)
                  WHERE season_round_id IS NOT NULL
                DO NOTHING
                """
            ),
            {"base_url": base_url},
        )

    async def _delete_expired_season_round_channels(
        self,
        session: AsyncSession,
        category: discord.CategoryChannel,
    ) -> None:
        result = await session.execute(
            text(
                """
                SELECT id::int, discord_channel_id
                FROM season_rounds
                WHERE discord_channel_id IS NOT NULL
                  AND scheduled_at IS NOT NULL
                  AND NOW() >= scheduled_at + INTERVAL '3 hours'
                ORDER BY scheduled_at, id
                FOR UPDATE SKIP LOCKED
                """
            )
        )
        for round_row in result.mappings():
            try:
                await delete_season_round_discord_channel(
                    category.guild, int(round_row["discord_channel_id"])
                )
                await session.execute(
                    text(
                        """
                        UPDATE season_rounds
                        SET discord_channel_id = NULL
                        WHERE id = :round_id
                          AND discord_channel_id = :channel_id
                        """
                    ),
                    {
                        "round_id": round_row["id"],
                        "channel_id": round_row["discord_channel_id"],
                    },
                )
            except (discord.HTTPException, asyncio.TimeoutError, RuntimeError) as error:
                print(
                    "[WEBSITE-BRIDGE] Failed to delete season round channel "
                    f"for round {round_row['id']}: {error}"
                )

    async def _ensure_active_season_round_channels(
        self,
        session: AsyncSession,
        category: discord.CategoryChannel,
    ) -> None:
        result = await session.execute(
            text(
                """
                SELECT round.id::int,
                       round.round_number::int,
                       round.name,
                       round.scheduled_at,
                       round.discord_channel_id,
                       ARRAY_AGG(registration.player_id
                                 ORDER BY registration.created_at,
                                          registration.player_id) AS participant_ids
                FROM season_rounds round
                JOIN season_round_registrations registration
                  ON registration.round_id = round.id
                WHERE round.scheduled_at IS NOT NULL
                  AND round.status <> 'cancelled'
                  AND NOW() < round.scheduled_at + INTERVAL '3 hours'
                GROUP BY round.id
                ORDER BY round.scheduled_at, round.id
                """
            )
        )
        for round_row in result.mappings():
            target = SeasonRoundDiscordChannelTarget(
                round_id=round_row["id"],
                round_number=round_row["round_number"],
                round_name=round_row["name"],
                scheduled_at=round_row["scheduled_at"],
                discord_channel_id=round_row["discord_channel_id"],
                participant_ids=tuple(round_row["participant_ids"]),
            )
            try:
                channel = await ensure_season_round_discord_channel(
                    category, target
                )
                if channel.id != target.discord_channel_id:
                    await session.execute(
                        text(
                            """
                            UPDATE season_rounds
                            SET discord_channel_id = :channel_id
                            WHERE id = :round_id
                            """
                        ),
                        {"round_id": target.round_id, "channel_id": channel.id},
                    )
            except (discord.HTTPException, asyncio.TimeoutError, RuntimeError) as error:
                print(
                    "[WEBSITE-BRIDGE] Failed to sync season round channel "
                    f"for round {target.round_id}: {error}"
                )

    async def _sync_season_round_discord_channels(
        self, session: AsyncSession
    ) -> None:
        try:
            category = await resolve_live_events_category(
                self.bot, LIVE_EVENTS_CATEGORY_ID
            )
        except (discord.HTTPException, asyncio.TimeoutError, RuntimeError) as error:
            print(f"[WEBSITE-BRIDGE] Live events category is unavailable: {error}")
            return
        await self._delete_expired_season_round_channels(session, category)
        await self._ensure_active_season_round_channels(session, category)

    @tasks.loop(seconds=15)
    async def deliver_notifications(self) -> None:
        async with async_session() as session:
            await self._sync_season_round_discord_channels(session)
            await self._queue_tournament_checkins(session)
            await self._queue_season_round_checkins(session)
            await self._queue_season_round_missing_checkins(session)
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
