from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol, cast

import discord
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


ANNOUNCEMENT_ASSET_ROOT = (
    Path(__file__).resolve().parents[1] / "assets" / "channel-announcements"
)


class AnnouncementBot(Protocol):
    def get_channel(self, channel_id: int) -> object | None: ...

    async def fetch_channel(self, channel_id: int) -> object: ...


class AnnouncementReportBot(Protocol):
    def get_user(self, user_id: int) -> object | None: ...

    async def fetch_user(self, user_id: int) -> object: ...


class AnnouncementChannel(Protocol):
    async def send(self, **message: object) -> object: ...


class SentAnnouncement(Protocol):
    id: int
    jump_url: str


class AnnouncementReportRecipient(Protocol):
    async def send(self, **message: object) -> object: ...


@dataclass(frozen=True)
class SentAnnouncementReceipt:
    message_id: int
    message_url: str


@dataclass(frozen=True)
class ChannelAnnouncement:
    id: int
    channel_id: int
    content: str
    attachment_name: str
    tournament_slug_to_publish: str | None = None


@dataclass(frozen=True)
class AnnouncementReport:
    id: int
    recipient_id: int
    description: str
    channel_id: int
    message_url: str


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
) -> SentAnnouncementReceipt:
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
    sent_announcement = cast(SentAnnouncement, sent_message)
    return SentAnnouncementReceipt(
        message_id=int(sent_announcement.id),
        message_url=sent_announcement.jump_url,
    )


async def send_announcement_report(
    bot: AnnouncementReportBot,
    report: AnnouncementReport,
) -> int:
    recipient = bot.get_user(report.recipient_id)
    if recipient is None:
        recipient = await bot.fetch_user(report.recipient_id)
    if not hasattr(recipient, "send"):
        raise TypeError("Announcement report recipient cannot receive messages")
    report_recipient = cast(AnnouncementReportRecipient, recipient)
    sent_message = await report_recipient.send(
        content=(
            f"✅ Отправлен {report.description}.\n"
            f"Канал: <#{report.channel_id}>\n"
            f"Пост: {report.message_url}"
        ),
        allowed_mentions=discord.AllowedMentions.none(),
    )
    return int(cast(SentAnnouncement, sent_message).id)


async def deliver_pending_channel_announcements(
    bot: AnnouncementBot,
    session: AsyncSession,
) -> None:
    result = await session.execute(
        text(
            """
            SELECT id::int, channel_id::bigint, content, attachment_name,
                   tournament_slug_to_publish
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
            tournament_slug_to_publish=row["tournament_slug_to_publish"],
        )
        for row in result.mappings().all()
    ]

    for announcement in announcements:
        try:
            receipt = await send_channel_announcement(bot, announcement)
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
                        discord_message_url = :message_url,
                        last_error = NULL
                    WHERE id = :id
                    """
                ),
                {
                    "id": announcement.id,
                    "message_id": receipt.message_id,
                    "message_url": receipt.message_url,
                },
            )
            if announcement.tournament_slug_to_publish is not None:
                await session.execute(
                    text(
                        """
                        UPDATE tournaments
                        SET status = 'registration', updated_at = NOW()
                        WHERE slug = :slug AND status IN ('draft', 'planned')
                        """
                    ),
                    {"slug": announcement.tournament_slug_to_publish},
                )
                await session.execute(
                    text(
                        """
                        UPDATE season_rounds AS round
                        SET is_visible = TRUE, updated_at = NOW()
                        FROM tournaments AS tournament
                        WHERE round.tournament_id = tournament.id
                          AND tournament.slug = :slug
                          AND round.round_kind = 'regular'
                        """
                    ),
                    {"slug": announcement.tournament_slug_to_publish},
                )
        await session.commit()


async def deliver_pending_announcement_reports(
    bot: AnnouncementReportBot,
    session: AsyncSession,
) -> None:
    result = await session.execute(
        text(
            """
            SELECT id::int, report_recipient_id::bigint, report_description,
                   channel_id::bigint, discord_message_url
            FROM channel_announcement_outbox
            WHERE status = 'sent'
              AND report_status = 'pending'
              AND report_available_at <= NOW()
            ORDER BY id
            FOR UPDATE SKIP LOCKED
            LIMIT 20
            """
        )
    )
    reports = [
        AnnouncementReport(
            id=row["id"],
            recipient_id=row["report_recipient_id"],
            description=row["report_description"],
            channel_id=row["channel_id"],
            message_url=row["discord_message_url"],
        )
        for row in result.mappings().all()
    ]

    for report in reports:
        try:
            report_message_id = await send_announcement_report(bot, report)
        except (discord.Forbidden, discord.NotFound, TypeError, ValueError) as error:
            await session.execute(
                text(
                    """
                    UPDATE channel_announcement_outbox
                    SET report_status = 'failed',
                        report_attempts = report_attempts + 1,
                        report_last_error = :error
                    WHERE id = :id
                    """
                ),
                {"id": report.id, "error": str(error)[:1000]},
            )
        except (discord.HTTPException, asyncio.TimeoutError, OSError) as error:
            await session.execute(
                text(
                    """
                    UPDATE channel_announcement_outbox
                    SET report_attempts = report_attempts + 1,
                        report_available_at = NOW() + INTERVAL '5 minutes',
                        report_last_error = :error,
                        report_status = CASE
                            WHEN report_attempts >= 4 THEN 'failed'
                            ELSE 'pending'
                        END
                    WHERE id = :id
                    """
                ),
                {"id": report.id, "error": str(error)[:1000]},
            )
        else:
            await session.execute(
                text(
                    """
                    UPDATE channel_announcement_outbox
                    SET report_status = 'sent', report_sent_at = NOW(),
                        report_attempts = report_attempts + 1,
                        report_message_id = :message_id,
                        report_last_error = NULL
                    WHERE id = :id
                    """
                ),
                {"id": report.id, "message_id": report_message_id},
            )
        await session.commit()
