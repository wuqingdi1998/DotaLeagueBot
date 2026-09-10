from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Protocol, cast

import discord
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from utils.website_notifications import notification_embed


class SeasonLobbyNotificationBot(Protocol):
    def get_user(self, user_id: int) -> object | None: ...

    async def fetch_user(self, user_id: int) -> object: ...


class SeasonLobbyNotificationRecipient(Protocol):
    async def send(self, **message: object) -> object: ...


class SentSeasonLobbyNotification(Protocol):
    id: int


@dataclass(frozen=True)
class SeasonLobbyNotification:
    id: int
    discord_id: int
    title: str
    message: str
    attempts: int


async def send_season_lobby_notification(
    bot: SeasonLobbyNotificationBot,
    notification: SeasonLobbyNotification,
) -> int:
    recipient = bot.get_user(notification.discord_id)
    if recipient is None:
        recipient = await bot.fetch_user(notification.discord_id)
    if not hasattr(recipient, "send"):
        raise TypeError("Season lobby notification recipient cannot receive messages")
    sent_message = await cast(SeasonLobbyNotificationRecipient, recipient).send(
        embed=notification_embed(
            notification.title,
            notification.message,
            None,
        ),
        allowed_mentions=discord.AllowedMentions.none(),
    )
    return int(cast(SentSeasonLobbyNotification, sent_message).id)


async def deliver_due_season_lobby_notifications(
    bot: SeasonLobbyNotificationBot,
    session: AsyncSession,
) -> int:
    result = await session.execute(
        text(
            """
            SELECT id::bigint, discord_id::bigint, title, message,
                   attempts::int
            FROM season_lobby_notification_outbox
            WHERE status = 'pending'
              AND scheduled_for <= NOW()
            ORDER BY scheduled_for, id
            FOR UPDATE SKIP LOCKED
            LIMIT 100
            """
        )
    )
    notifications = [
        SeasonLobbyNotification(
            id=int(row["id"]),
            discord_id=int(row["discord_id"]),
            title=str(row["title"]),
            message=str(row["message"]),
            attempts=int(row["attempts"]),
        )
        for row in result.mappings().all()
    ]

    for notification in notifications:
        try:
            message_id = await send_season_lobby_notification(bot, notification)
        except (discord.Forbidden, discord.NotFound, TypeError, ValueError) as error:
            await session.execute(
                text(
                    """
                    UPDATE season_lobby_notification_outbox
                    SET status = 'failed', attempts = attempts + 1,
                        last_error = :error, updated_at = NOW()
                    WHERE id = :id
                    """
                ),
                {"id": notification.id, "error": str(error)[:1000]},
            )
        except (discord.HTTPException, asyncio.TimeoutError, OSError) as error:
            await session.execute(
                text(
                    """
                    UPDATE season_lobby_notification_outbox
                    SET status = CASE
                            WHEN attempts >= 2 THEN 'failed'
                            ELSE 'pending'
                        END,
                        attempts = attempts + 1,
                        scheduled_for = NOW() + INTERVAL '30 seconds',
                        last_error = :error,
                        updated_at = NOW()
                    WHERE id = :id
                    """
                ),
                {"id": notification.id, "error": str(error)[:1000]},
            )
        else:
            await session.execute(
                text(
                    """
                    UPDATE season_lobby_notification_outbox
                    SET status = 'sent', attempts = attempts + 1,
                        sent_at = NOW(), discord_message_id = :message_id,
                        last_error = NULL, updated_at = NOW()
                    WHERE id = :id
                    """
                ),
                {"id": notification.id, "message_id": message_id},
            )
        await session.commit()

    return len(notifications)
