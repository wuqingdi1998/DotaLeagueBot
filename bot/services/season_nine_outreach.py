from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Iterable
from dataclasses import dataclass
from typing import Literal, Protocol, cast

import discord
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from utils.website_notifications import notification_embed


CAMPAIGN_KEY = "season-nine-round-one-outreach"
AudienceKind = Literal["registered", "unregistered"]


class DiscordMemberSource(Protocol):
    id: int
    bot: bool


class OutreachGuild(Protocol):
    def fetch_members(
        self,
        *,
        limit: int | None,
    ) -> AsyncIterator[DiscordMemberSource]: ...


class OutreachRecipient(Protocol):
    async def send(self, **message: object) -> object: ...


class OutreachBot(Protocol):
    def get_guild(self, guild_id: int) -> object | None: ...

    def get_user(self, user_id: int) -> object | None: ...

    async def fetch_user(self, user_id: int) -> object: ...


class SentDirectMessage(Protocol):
    id: int


@dataclass(frozen=True)
class OutreachMember:
    discord_id: int
    is_bot: bool


@dataclass(frozen=True)
class CampaignAudience:
    registered_player_ids: tuple[int, ...]
    unregistered_member_ids: tuple[int, ...]
    skipped_round_registered_count: int
    skipped_bot_count: int


@dataclass(frozen=True)
class OutreachCampaign:
    title: str
    registered_message: str
    unregistered_message: str


@dataclass(frozen=True)
class OutreachReport:
    registered_total: int
    registered_sent: int
    registered_failed: int
    unregistered_total: int
    unregistered_sent: int
    unregistered_failed: int
    skipped_round_registered_count: int
    skipped_bot_count: int


def classify_campaign_members(
    members: Iterable[OutreachMember],
    registered_player_ids: set[int],
    round_registered_player_ids: set[int],
) -> CampaignAudience:
    member_list = list(members)
    human_member_ids = {
        member.discord_id for member in member_list if not member.is_bot
    }
    registered_audience = sorted(
        (human_member_ids & registered_player_ids)
        - round_registered_player_ids
    )
    unregistered_audience = sorted(human_member_ids - registered_player_ids)
    return CampaignAudience(
        registered_player_ids=tuple(registered_audience),
        unregistered_member_ids=tuple(unregistered_audience),
        skipped_round_registered_count=len(
            human_member_ids & round_registered_player_ids
        ),
        skipped_bot_count=sum(1 for member in member_list if member.is_bot),
    )


def outreach_report_text(report: OutreachReport) -> str:
    total = report.registered_total + report.unregistered_total
    sent = report.registered_sent + report.unregistered_sent
    failed = report.registered_failed + report.unregistered_failed
    return (
        "✅ Рассылка девятого сезона завершена.\n\n"
        f"Доставлено: **{sent} из {total}**\n"
        f"Не доставлено: **{failed}**\n\n"
        "Зарегистрированы в базе, но не на 1-й тур: "
        f"**{report.registered_sent} из {report.registered_total}** доставлено, "
        f"**{report.registered_failed}** не доставлено.\n"
        "Нет регистрации в базе: "
        f"**{report.unregistered_sent} из {report.unregistered_total}** доставлено, "
        f"**{report.unregistered_failed}** не доставлено.\n\n"
        "Не включены в рассылку: уже зарегистрированы на 1-й тур — "
        f"**{report.skipped_round_registered_count}**, боты — "
        f"**{report.skipped_bot_count}**."
    )


async def send_outreach_message(
    bot: OutreachBot,
    discord_id: int,
    audience: AudienceKind,
    campaign: OutreachCampaign,
) -> int:
    recipient = bot.get_user(discord_id)
    if recipient is None:
        recipient = await bot.fetch_user(discord_id)
    if not hasattr(recipient, "send"):
        raise TypeError("Direct message recipient cannot receive messages")
    message = (
        campaign.registered_message
        if audience == "registered"
        else campaign.unregistered_message
    )
    sent_message = await cast(OutreachRecipient, recipient).send(
        embed=notification_embed(campaign.title, message, None),
        allowed_mentions=discord.AllowedMentions.none(),
    )
    return int(cast(SentDirectMessage, sent_message).id)


async def _fetch_campaign_members(guild: OutreachGuild) -> list[OutreachMember]:
    return [
        OutreachMember(discord_id=int(member.id), is_bot=bool(member.bot))
        async for member in guild.fetch_members(limit=None)
    ]


async def _reschedule_campaign_preparation(
    session: AsyncSession,
    campaign_id: int,
    error: Exception,
) -> None:
    await session.execute(
        text(
            """
            UPDATE direct_message_campaigns
            SET status = 'scheduled',
                next_attempt_at = NOW() + INTERVAL '1 minute',
                last_error = :error,
                updated_at = NOW()
            WHERE id = :campaign_id
            """
        ),
        {"campaign_id": campaign_id, "error": str(error)[:1000]},
    )
    await session.commit()


async def prepare_due_outreach_campaign(
    bot: OutreachBot,
    session: AsyncSession,
    guild_id: int,
) -> bool:
    result = await session.execute(
        text(
            """
            SELECT id::int, tournament_slug, round_number::int
            FROM direct_message_campaigns
            WHERE campaign_key = :campaign_key
              AND scheduled_at <= NOW()
              AND next_attempt_at <= NOW()
              AND (
                status = 'scheduled'
                OR (
                  status = 'preparing'
                  AND updated_at <= NOW() - INTERVAL '5 minutes'
                )
              )
            ORDER BY id
            FOR UPDATE SKIP LOCKED
            LIMIT 1
            """
        ),
        {"campaign_key": CAMPAIGN_KEY},
    )
    campaign_row = result.mappings().first()
    if campaign_row is None:
        return False

    campaign_id = int(campaign_row["id"])
    await session.execute(
        text(
            """
            UPDATE direct_message_campaigns
            SET status = 'preparing', updated_at = NOW(), last_error = NULL
            WHERE id = :campaign_id
            """
        ),
        {"campaign_id": campaign_id},
    )
    await session.commit()

    guild = bot.get_guild(guild_id)
    if guild is None or not hasattr(guild, "fetch_members"):
        await _reschedule_campaign_preparation(
            session,
            campaign_id,
            TypeError("Configured Discord server is unavailable"),
        )
        return False

    try:
        members = await _fetch_campaign_members(cast(OutreachGuild, guild))
    except (discord.HTTPException, asyncio.TimeoutError, OSError) as error:
        await _reschedule_campaign_preparation(session, campaign_id, error)
        return False

    registered_result = await session.execute(
        text("SELECT discord_id::bigint FROM players")
    )
    registered_player_ids = {
        int(row["discord_id"]) for row in registered_result.mappings().all()
    }
    round_result = await session.execute(
        text(
            """
            SELECT registration.player_id::bigint AS discord_id
            FROM season_round_registrations AS registration
            JOIN season_rounds AS round ON round.id = registration.round_id
            JOIN tournaments AS tournament ON tournament.id = round.tournament_id
            WHERE tournament.slug = :tournament_slug
              AND round.round_number = :round_number
            """
        ),
        {
            "tournament_slug": campaign_row["tournament_slug"],
            "round_number": campaign_row["round_number"],
        },
    )
    round_registered_player_ids = {
        int(row["discord_id"]) for row in round_result.mappings().all()
    }
    audience = classify_campaign_members(
        members,
        registered_player_ids,
        round_registered_player_ids,
    )
    recipient_rows = [
        {
            "campaign_id": campaign_id,
            "discord_id": discord_id,
            "audience": "registered",
        }
        for discord_id in audience.registered_player_ids
    ] + [
        {
            "campaign_id": campaign_id,
            "discord_id": discord_id,
            "audience": "unregistered",
        }
        for discord_id in audience.unregistered_member_ids
    ]
    if recipient_rows:
        await session.execute(
            text(
                """
                INSERT INTO direct_message_campaign_recipients (
                    campaign_id, discord_id, audience
                )
                VALUES (:campaign_id, :discord_id, :audience)
                ON CONFLICT (campaign_id, discord_id) DO NOTHING
                """
            ),
            recipient_rows,
        )
    await session.execute(
        text(
            """
            UPDATE direct_message_campaigns
            SET status = 'sending', prepared_at = NOW(), next_batch_at = NOW(),
                discovered_member_count = :discovered_member_count,
                skipped_round_registered_count = :skipped_round_registered_count,
                skipped_bot_count = :skipped_bot_count,
                updated_at = NOW(), last_error = NULL
            WHERE id = :campaign_id
            """
        ),
        {
            "campaign_id": campaign_id,
            "discovered_member_count": len(members),
            "skipped_round_registered_count": (
                audience.skipped_round_registered_count
            ),
            "skipped_bot_count": audience.skipped_bot_count,
        },
    )
    await session.commit()
    return True


async def _complete_campaign_if_finished(
    session: AsyncSession,
    campaign_id: int,
) -> None:
    await session.execute(
        text(
            """
            UPDATE direct_message_campaigns AS campaign
            SET status = 'completed', completed_at = NOW(), updated_at = NOW()
            WHERE campaign.id = :campaign_id
              AND campaign.status = 'sending'
              AND NOT EXISTS (
                SELECT 1
                FROM direct_message_campaign_recipients AS recipient
                WHERE recipient.campaign_id = campaign.id
                  AND recipient.status = 'pending'
              )
            """
        ),
        {"campaign_id": campaign_id},
    )
    await session.commit()


async def deliver_due_outreach_batch(
    bot: OutreachBot,
    session: AsyncSession,
) -> int:
    campaign_result = await session.execute(
        text(
            """
            SELECT id::int, title, registered_message, unregistered_message,
                   batch_size::int, batch_interval_seconds::int
            FROM direct_message_campaigns
            WHERE campaign_key = :campaign_key
              AND status = 'sending'
              AND next_batch_at <= NOW()
            ORDER BY id
            FOR UPDATE SKIP LOCKED
            LIMIT 1
            """
        ),
        {"campaign_key": CAMPAIGN_KEY},
    )
    campaign_row = campaign_result.mappings().first()
    if campaign_row is None:
        return 0

    campaign_id = int(campaign_row["id"])
    recipient_result = await session.execute(
        text(
            """
            SELECT id::bigint, discord_id::bigint, audience, attempts::int
            FROM direct_message_campaign_recipients
            WHERE campaign_id = :campaign_id
              AND status = 'pending'
              AND available_at <= NOW()
            ORDER BY id
            FOR UPDATE SKIP LOCKED
            LIMIT :batch_size
            """
        ),
        {
            "campaign_id": campaign_id,
            "batch_size": campaign_row["batch_size"],
        },
    )
    recipients = recipient_result.mappings().all()
    if not recipients:
        await _complete_campaign_if_finished(session, campaign_id)
        return 0

    await session.execute(
        text(
            """
            UPDATE direct_message_campaigns
            SET next_batch_at = NOW()
                    + (:batch_interval_seconds * INTERVAL '1 second'),
                updated_at = NOW()
            WHERE id = :campaign_id
            """
        ),
        {
            "campaign_id": campaign_id,
            "batch_interval_seconds": campaign_row["batch_interval_seconds"],
        },
    )
    await session.commit()

    campaign = OutreachCampaign(
        title=str(campaign_row["title"]),
        registered_message=str(campaign_row["registered_message"]),
        unregistered_message=str(campaign_row["unregistered_message"]),
    )
    for recipient in recipients:
        recipient_id = int(recipient["id"])
        try:
            message_id = await send_outreach_message(
                bot,
                int(recipient["discord_id"]),
                cast(AudienceKind, recipient["audience"]),
                campaign,
            )
        except (discord.Forbidden, discord.NotFound, TypeError, ValueError) as error:
            await session.execute(
                text(
                    """
                    UPDATE direct_message_campaign_recipients
                    SET status = 'failed', attempts = attempts + 1,
                        last_error = :error
                    WHERE id = :recipient_id
                    """
                ),
                {"recipient_id": recipient_id, "error": str(error)[:1000]},
            )
        except (discord.HTTPException, asyncio.TimeoutError, OSError) as error:
            await session.execute(
                text(
                    """
                    UPDATE direct_message_campaign_recipients
                    SET status = CASE WHEN attempts >= 2 THEN 'failed' ELSE 'pending' END,
                        attempts = attempts + 1,
                        available_at = NOW() + INTERVAL '30 seconds',
                        last_error = :error
                    WHERE id = :recipient_id
                    """
                ),
                {"recipient_id": recipient_id, "error": str(error)[:1000]},
            )
        else:
            await session.execute(
                text(
                    """
                    UPDATE direct_message_campaign_recipients
                    SET status = 'sent', attempts = attempts + 1,
                        sent_at = NOW(), discord_message_id = :message_id,
                        last_error = NULL
                    WHERE id = :recipient_id
                    """
                ),
                {"recipient_id": recipient_id, "message_id": message_id},
            )
        await session.commit()

    await _complete_campaign_if_finished(session, campaign_id)
    return len(recipients)


async def send_completed_outreach_report(
    bot: OutreachBot,
    session: AsyncSession,
) -> bool:
    result = await session.execute(
        text(
            """
            SELECT campaign.id::int, campaign.report_recipient_id::bigint,
                   campaign.skipped_round_registered_count::int,
                   campaign.skipped_bot_count::int,
                   COUNT(recipient.id) FILTER (
                     WHERE recipient.audience = 'registered'
                   )::int AS registered_total,
                   COUNT(recipient.id) FILTER (
                     WHERE recipient.audience = 'registered'
                       AND recipient.status = 'sent'
                   )::int AS registered_sent,
                   COUNT(recipient.id) FILTER (
                     WHERE recipient.audience = 'registered'
                       AND recipient.status = 'failed'
                   )::int AS registered_failed,
                   COUNT(recipient.id) FILTER (
                     WHERE recipient.audience = 'unregistered'
                   )::int AS unregistered_total,
                   COUNT(recipient.id) FILTER (
                     WHERE recipient.audience = 'unregistered'
                       AND recipient.status = 'sent'
                   )::int AS unregistered_sent,
                   COUNT(recipient.id) FILTER (
                     WHERE recipient.audience = 'unregistered'
                       AND recipient.status = 'failed'
                   )::int AS unregistered_failed
            FROM direct_message_campaigns AS campaign
            LEFT JOIN direct_message_campaign_recipients AS recipient
              ON recipient.campaign_id = campaign.id
            WHERE campaign.campaign_key = :campaign_key
              AND campaign.status = 'completed'
              AND campaign.report_status = 'pending'
              AND campaign.report_available_at <= NOW()
            GROUP BY campaign.id
            LIMIT 1
            """
        ),
        {"campaign_key": CAMPAIGN_KEY},
    )
    row = result.mappings().first()
    if row is None:
        return False

    report = OutreachReport(
        registered_total=int(row["registered_total"]),
        registered_sent=int(row["registered_sent"]),
        registered_failed=int(row["registered_failed"]),
        unregistered_total=int(row["unregistered_total"]),
        unregistered_sent=int(row["unregistered_sent"]),
        unregistered_failed=int(row["unregistered_failed"]),
        skipped_round_registered_count=int(
            row["skipped_round_registered_count"]
        ),
        skipped_bot_count=int(row["skipped_bot_count"]),
    )
    try:
        recipient = bot.get_user(int(row["report_recipient_id"]))
        if recipient is None:
            recipient = await bot.fetch_user(int(row["report_recipient_id"]))
        if not hasattr(recipient, "send"):
            raise TypeError("Campaign report recipient cannot receive messages")
        sent_message = await cast(OutreachRecipient, recipient).send(
            content=outreach_report_text(report),
            allowed_mentions=discord.AllowedMentions.none(),
        )
    except (discord.Forbidden, discord.NotFound, TypeError) as error:
        await session.execute(
            text(
                """
                UPDATE direct_message_campaigns
                SET report_status = 'failed', report_attempts = report_attempts + 1,
                    report_last_error = :error, updated_at = NOW()
                WHERE id = :campaign_id
                """
            ),
            {"campaign_id": row["id"], "error": str(error)[:1000]},
        )
    except (discord.HTTPException, asyncio.TimeoutError, OSError) as error:
        await session.execute(
            text(
                """
                UPDATE direct_message_campaigns
                SET report_status = CASE
                      WHEN report_attempts >= 2 THEN 'failed'
                      ELSE 'pending'
                    END,
                    report_attempts = report_attempts + 1,
                    report_available_at = NOW() + INTERVAL '30 seconds',
                    report_last_error = :error, updated_at = NOW()
                WHERE id = :campaign_id
                """
            ),
            {"campaign_id": row["id"], "error": str(error)[:1000]},
        )
    else:
        await session.execute(
            text(
                """
                UPDATE direct_message_campaigns
                SET report_status = 'sent', report_sent_at = NOW(),
                    report_attempts = report_attempts + 1,
                    report_message_id = :message_id,
                    report_last_error = NULL, updated_at = NOW()
                WHERE id = :campaign_id
                """
            ),
            {
                "campaign_id": row["id"],
                "message_id": int(cast(SentDirectMessage, sent_message).id),
            },
        )
    await session.commit()
    return True
