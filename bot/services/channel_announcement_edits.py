from __future__ import annotations

import asyncio
from typing import Protocol, cast

import discord
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.channel_announcement_delivery import AnnouncementBot


class EditableAnnouncement(Protocol):
    async def edit(self, *, content: str, allowed_mentions: discord.AllowedMentions) -> object: ...


class AnnouncementHistory(Protocol):
    async def fetch_message(self, message_id: int) -> EditableAnnouncement: ...


async def edit_channel_announcement(
    bot: AnnouncementBot, channel_id: int, message_id: int, content: str,
) -> None:
    channel = bot.get_channel(channel_id)
    if channel is None:
        channel = await bot.fetch_channel(channel_id)
    if not hasattr(channel, "fetch_message"):
        raise TypeError("Announcement destination has no message history")
    message = await cast(AnnouncementHistory, channel).fetch_message(message_id)
    edited = await message.edit(content=content, allowed_mentions=discord.AllowedMentions.none())
    if getattr(edited, "content", None) != content:
        raise ValueError("Discord did not confirm the corrected announcement content")


async def deliver_pending_announcement_edits(bot: AnnouncementBot, session: AsyncSession) -> None:
    result = await session.execute(text("""
        SELECT edit.announcement_id, announcement.channel_id,
               announcement.discord_message_id, announcement.content
        FROM channel_announcement_edits edit
        JOIN channel_announcement_outbox announcement ON announcement.id = edit.announcement_id
        WHERE edit.attempts < 5 AND edit.available_at <= NOW()
          AND announcement.status = 'sent' AND announcement.discord_message_id IS NOT NULL
        ORDER BY edit.available_at, edit.announcement_id
        FOR UPDATE OF edit, announcement SKIP LOCKED LIMIT 20
    """))
    for row in result.mappings().all():
        try:
            await edit_channel_announcement(
                bot, int(row["channel_id"]), int(row["discord_message_id"]), str(row["content"]),
            )
        except (discord.HTTPException, asyncio.TimeoutError, OSError, TypeError, ValueError) as error:
            await session.execute(text("""
                UPDATE channel_announcement_edits SET attempts = attempts + 1,
                    available_at = NOW() + INTERVAL '5 minutes', last_error = :error
                WHERE announcement_id = :id
            """), {"id": row["announcement_id"], "error": str(error)[:1000]})
        else:
            await session.execute(text("""
                DELETE FROM channel_announcement_edits WHERE announcement_id = :id
            """), {"id": row["announcement_id"]})
        await session.commit()
