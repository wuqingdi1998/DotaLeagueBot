from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from datetime import datetime
from typing import Protocol, cast

import discord
from sqlalchemy import text
from sqlalchemy.engine import RowMapping
from sqlalchemy.ext.asyncio import AsyncSession

from services.compendium_announcement import (
    compendium_announcement_text,
    is_compendium_announcement_recipient,
)


CAMPAIGN_KEY = "october-compendium-launch"
BATCH_SIZE = 10
BATCH_INTERVAL_SECONDS = 10


class CampaignMember(Protocol):
    id: int
    bot: bool
    roles: list[object]


class CampaignGuild(Protocol):
    def fetch_members(
        self, *, limit: int | None
    ) -> AsyncIterator[CampaignMember]: ...


class CampaignRecipient(Protocol):
    async def send(self, message: str) -> object: ...


class CampaignBot(Protocol):
    def get_guild(self, guild_id: int) -> object | None: ...

    def get_user(self, user_id: int) -> object | None: ...

    async def fetch_user(self, user_id: int) -> object: ...


async def prepare_due_campaign(
    bot: CampaignBot,
    session: AsyncSession,
    guild_id: int,
) -> bool:
    result = await session.execute(
        text(
            """
            UPDATE october_compendium_announcement_campaigns
            SET status = 'preparing', updated_at = NOW()
            WHERE campaign_key = :campaign_key
              AND (
                (status = 'scheduled' AND scheduled_at <= NOW())
                OR (status = 'preparing' AND updated_at <= NOW() - INTERVAL '30 seconds')
              )
            RETURNING id::int
            """
        ),
        {"campaign_key": CAMPAIGN_KEY},
    )
    campaign_id = result.scalar_one_or_none()
    if campaign_id is None:
        return False
    await session.commit()

    guild = bot.get_guild(guild_id)
    if guild is None or not hasattr(guild, "fetch_members"):
        await _retry_preparation(session, campaign_id)
        return False
    try:
        members = [
            member
            async for member in cast(CampaignGuild, guild).fetch_members(limit=None)
        ]
    except (discord.HTTPException, asyncio.TimeoutError, OSError):
        await _retry_preparation(session, campaign_id)
        return False

    recipients = [
        {"campaign_id": campaign_id, "discord_id": int(member.id)}
        for member in members
        if is_compendium_announcement_recipient(member)
    ]
    if recipients:
        await session.execute(
            text(
                """
                INSERT INTO october_compendium_announcement_recipients (
                    campaign_id, discord_id
                ) VALUES (:campaign_id, :discord_id)
                ON CONFLICT (campaign_id, discord_id) DO NOTHING
                """
            ),
            recipients,
        )
    skipped_bot_count = len([member for member in members if member.bot])
    skipped_excluded_count = len([
        member
        for member in members
        if not member.bot and not is_compendium_announcement_recipient(member)
    ])
    await session.execute(
        text(
            """
            UPDATE october_compendium_announcement_campaigns
            SET status = 'sending', next_batch_at = NOW(),
                discovered_member_count = :discovered_member_count,
                skipped_bot_count = :skipped_bot_count,
                skipped_excluded_count = :skipped_excluded_count,
                updated_at = NOW()
            WHERE id = :campaign_id
            """
        ),
        {
            "campaign_id": campaign_id,
            "discovered_member_count": len(members),
            "skipped_bot_count": skipped_bot_count,
            "skipped_excluded_count": skipped_excluded_count,
        },
    )
    await session.commit()
    return True


async def _retry_preparation(session: AsyncSession, campaign_id: int) -> None:
    await session.execute(
        text(
            """
            UPDATE october_compendium_announcement_campaigns
            SET status = 'scheduled', scheduled_at = NOW() + INTERVAL '30 seconds',
                updated_at = NOW()
            WHERE id = :campaign_id
            """
        ),
        {"campaign_id": campaign_id},
    )
    await session.commit()


async def deliver_due_batch(bot: CampaignBot, session: AsyncSession) -> int:
    campaign_result = await session.execute(
        text(
            """
            SELECT id::int
            FROM october_compendium_announcement_campaigns
            WHERE campaign_key = :campaign_key
              AND status = 'sending'
              AND next_batch_at <= NOW()
            FOR UPDATE SKIP LOCKED
            """
        ),
        {"campaign_key": CAMPAIGN_KEY},
    )
    campaign_id = campaign_result.scalar_one_or_none()
    if campaign_id is None:
        return 0
    recipient_result = await session.execute(
        text(
            """
            SELECT id::bigint, discord_id::bigint, attempts::int
            FROM october_compendium_announcement_recipients
            WHERE campaign_id = :campaign_id
              AND status = 'pending'
              AND available_at <= NOW()
            ORDER BY id
            FOR UPDATE SKIP LOCKED
            LIMIT :batch_size
            """
        ),
        {"campaign_id": campaign_id, "batch_size": BATCH_SIZE},
    )
    recipients = recipient_result.mappings().all()
    if not recipients:
        await _complete_if_finished(session, campaign_id)
        return 0
    await session.execute(
        text(
            """
            UPDATE october_compendium_announcement_campaigns
            SET next_batch_at = NOW() + (:delay * INTERVAL '1 second'),
                updated_at = NOW()
            WHERE id = :campaign_id
            """
        ),
        {"campaign_id": campaign_id, "delay": BATCH_INTERVAL_SECONDS},
    )
    await session.commit()

    for row in recipients:
        await _deliver_recipient(bot, session, row)
    await _complete_if_finished(session, campaign_id)
    return len(recipients)


async def _deliver_recipient(
    bot: CampaignBot,
    session: AsyncSession,
    row: RowMapping,
) -> None:
    recipient_id = int(row["id"])
    try:
        recipient = bot.get_user(int(row["discord_id"]))
        if recipient is None:
            recipient = await bot.fetch_user(int(row["discord_id"]))
        if not hasattr(recipient, "send"):
            raise TypeError("Discord recipient cannot receive messages")
        message = await cast(CampaignRecipient, recipient).send(
            compendium_announcement_text()
        )
        message_id = int(getattr(message, "id"))
    except (discord.Forbidden, discord.NotFound, TypeError, ValueError) as error:
        await _mark_failed(session, recipient_id, error)
    except (discord.HTTPException, asyncio.TimeoutError, OSError) as error:
        await _mark_retry(session, recipient_id, int(row["attempts"]), error)
    else:
        await session.execute(
            text(
                """
                UPDATE october_compendium_announcement_recipients
                SET status = 'sent', attempts = attempts + 1, sent_at = NOW(),
                    discord_message_id = :message_id, last_error = NULL
                WHERE id = :recipient_id
                """
            ),
            {"recipient_id": recipient_id, "message_id": message_id},
        )
        await session.commit()


async def _mark_failed(
    session: AsyncSession, recipient_id: int, error: Exception
) -> None:
    await session.execute(
        text(
            """
            UPDATE october_compendium_announcement_recipients
            SET status = 'failed', attempts = attempts + 1, last_error = :error
            WHERE id = :recipient_id
            """
        ),
        {"recipient_id": recipient_id, "error": str(error)[:1000]},
    )
    await session.commit()


async def _mark_retry(
    session: AsyncSession,
    recipient_id: int,
    attempts: int,
    error: Exception,
) -> None:
    await session.execute(
        text(
            """
            UPDATE october_compendium_announcement_recipients
            SET status = CASE WHEN :attempts >= 2 THEN 'failed' ELSE 'pending' END,
                attempts = attempts + 1,
                available_at = NOW() + INTERVAL '30 seconds',
                last_error = :error
            WHERE id = :recipient_id
            """
        ),
        {
            "recipient_id": recipient_id,
            "attempts": attempts,
            "error": str(error)[:1000],
        },
    )
    await session.commit()


async def _complete_if_finished(
    session: AsyncSession, campaign_id: int
) -> None:
    await session.execute(
        text(
            """
            UPDATE october_compendium_announcement_campaigns campaign
            SET status = 'completed', completed_at = NOW(), updated_at = NOW()
            WHERE campaign.id = :campaign_id
              AND NOT EXISTS (
                SELECT 1
                FROM october_compendium_announcement_recipients recipient
                WHERE recipient.campaign_id = campaign.id
                  AND recipient.status = 'pending'
              )
            """
        ),
        {"campaign_id": campaign_id},
    )
    await session.commit()


async def next_campaign_due_at(session: AsyncSession) -> datetime | None:
    result = await session.execute(
        text(
            """
            SELECT CASE
                WHEN status = 'scheduled' THEN scheduled_at
                WHEN status = 'preparing' THEN updated_at + INTERVAL '30 seconds'
                WHEN status = 'sending' THEN GREATEST(
                  next_batch_at,
                  COALESCE((
                    SELECT MIN(recipient.available_at)
                    FROM october_compendium_announcement_recipients recipient
                    WHERE recipient.campaign_id = campaign.id
                      AND recipient.status = 'pending'
                  ), next_batch_at)
                )
                ELSE NULL
              END
            FROM october_compendium_announcement_campaigns campaign
            WHERE campaign_key = :campaign_key
            """
        ),
        {"campaign_key": CAMPAIGN_KEY},
    )
    return result.scalar_one_or_none()
