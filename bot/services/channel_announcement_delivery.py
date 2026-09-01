from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol, cast

import discord
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


ANNOUNCEMENT_ASSET_ROOT = (
    Path(__file__).resolve().parents[1] / "assets" / "league-registration"
)


class AnnouncementBot(Protocol):
    def get_channel(self, channel_id: int) -> object | None: ...

    async def fetch_channel(self, channel_id: int) -> object: ...


class AnnouncementChannel(Protocol):
    async def send(self, **message: object) -> object: ...


class SentAnnouncement(Protocol):
    id: int


@dataclass(frozen=True)
class ChannelAnnouncement:
    id: int
    channel_id: int
    content: str
    attachment_name: str


def announcement_asset_path(
    attachment_name: str,
    asset_root: Path = ANNOUNCEMENT_ASSET_ROOT,
) -> Path:
    asset_path = (asset_root / attachment_name).resolve()
    if asset_path.parent != asset_root.resolve():
        raise ValueError("Announcement attachment must be inside the asset folder")
    if not asset_path.is_file():
        raise FileNotFoundError(f"Announcement attachment not found: {attachment_name}")
    return asset_path


async def send_channel_announcement(
    bot: AnnouncementBot,
    announcement: ChannelAnnouncement,
    asset_root: Path = ANNOUNCEMENT_ASSET_ROOT,
) -> int:
    channel = bot.get_channel(announcement.channel_id)
    if channel is None:
        channel = await bot.fetch_channel(announcement.channel_id)
    if not hasattr(channel, "send"):
        raise TypeError("Announcement destination is not a message channel")
    announcement_channel = cast(AnnouncementChannel, channel)

    asset_path = announcement_asset_path(
        announcement.attachment_name,
        asset_root,
    )
    with asset_path.open("rb") as image:
        sent_message = await announcement_channel.send(
            content=announcement.content,
            file=discord.File(image, filename=announcement.attachment_name),
            allowed_mentions=discord.AllowedMentions(
                everyone=True,
                users=False,
                roles=False,
                replied_user=False,
            ),
        )
    return int(cast(SentAnnouncement, sent_message).id)


async def deliver_pending_channel_announcements(
    bot: AnnouncementBot,
    session: AsyncSession,
) -> None:
    result = await session.execute(
        text(
            """
            SELECT id::int, channel_id::bigint, content, attachment_name
            FROM channel_announcement_outbox
            WHERE status = 'pending'
              AND available_at <= NOW()
            ORDER BY id
            FOR UPDATE SKIP LOCKED
            LIMIT 20
            """
        )
    )
    announcements = [
        ChannelAnnouncement(
            id=row["id"],
            channel_id=row["channel_id"],
            content=row["content"],
            attachment_name=row["attachment_name"],
        )
        for row in result.mappings().all()
    ]

    for announcement in announcements:
        try:
            message_id = await send_channel_announcement(bot, announcement)
        except (discord.Forbidden, discord.NotFound, TypeError, ValueError) as error:
            await session.execute(
                text(
                    """
                    UPDATE channel_announcement_outbox
                    SET status = 'failed', attempts = attempts + 1,
                        last_error = :error
                    WHERE id = :id
                    """
                ),
                {"id": announcement.id, "error": str(error)[:1000]},
            )
        except (
            discord.HTTPException,
            asyncio.TimeoutError,
            OSError,
        ) as error:
            await session.execute(
                text(
                    """
                    UPDATE channel_announcement_outbox
                    SET attempts = attempts + 1,
                        available_at = NOW() + INTERVAL '5 minutes',
                        last_error = :error,
                        status = CASE
                            WHEN attempts >= 4 THEN 'failed'
                            ELSE 'pending'
                        END
                    WHERE id = :id
                    """
                ),
                {"id": announcement.id, "error": str(error)[:1000]},
            )
        else:
            await session.execute(
                text(
                    """
                    UPDATE channel_announcement_outbox
                    SET status = 'sent', sent_at = NOW(),
                        attempts = attempts + 1,
                        discord_message_id = :message_id,
                        last_error = NULL
                    WHERE id = :id
                    """
                ),
                {"id": announcement.id, "message_id": message_id},
            )
        await session.commit()
