from __future__ import annotations

import os
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime

import discord
from sqlalchemy import text
from sqlalchemy.engine import RowMapping
from sqlalchemy.ext.asyncio import AsyncSession


ANNOUNCEMENT_ROLE_IDS = frozenset(
    {
        1177772084152258581,
        1037303834361483264,
    }
)
DEFAULT_PUBLIC_BASE_URL = "https://lsesports.ru"


@dataclass(frozen=True)
class UpcomingSeasonRound:
    id: int
    round_number: int
    name: str
    scheduled_at: datetime
    tournament_slug: str


@dataclass(frozen=True)
class AnnouncementDeliveryReport:
    total: int
    sent: int
    failed: int


def _season_round_from_row(row: RowMapping) -> UpcomingSeasonRound:
    return UpcomingSeasonRound(
        id=int(row["id"]),
        round_number=int(row["round_number"]),
        name=str(row["name"]),
        scheduled_at=row["scheduled_at"],
        tournament_slug=str(row["tournament_slug"]),
    )


async def find_upcoming_season_round(
    session: AsyncSession,
) -> UpcomingSeasonRound | None:
    result = await session.execute(
        text(
            """
            SELECT round.id::int,
                   round.round_number::int,
                   COALESCE(NULLIF(TRIM(round.name), ''), 'Без названия') AS name,
                   round.scheduled_at,
                   tournament.slug AS tournament_slug
            FROM season_rounds AS round
            JOIN tournaments AS tournament ON tournament.id = round.tournament_id
            WHERE tournament.tournament_type = 'seasonal'
              AND tournament.status = 'active'
              AND round.round_kind = 'regular'
              AND round.is_visible = TRUE
              AND round.scheduled_at > NOW()
              AND season_round_status_at(round.scheduled_at, round.status) = 'planned'
            ORDER BY round.scheduled_at, round.id
            LIMIT 1
            """
        )
    )
    row = result.mappings().first()
    if row is None:
        return None
    return _season_round_from_row(row)


async def get_season_round(
    session: AsyncSession,
    round_id: int,
) -> UpcomingSeasonRound | None:
    result = await session.execute(
        text(
            """
            SELECT round.id::int,
                   round.round_number::int,
                   COALESCE(NULLIF(TRIM(round.name), ''), 'Без названия') AS name,
                   round.scheduled_at,
                   tournament.slug AS tournament_slug
            FROM season_rounds AS round
            JOIN tournaments AS tournament ON tournament.id = round.tournament_id
            WHERE round.id = :round_id
              AND round.scheduled_at IS NOT NULL
            """
        ),
        {"round_id": round_id},
    )
    row = result.mappings().first()
    if row is None:
        return None
    return _season_round_from_row(row)


def build_announcement_message(
    season_round: UpcomingSeasonRound,
    public_base_url: str | None = None,
) -> str:
    start_timestamp = int(season_round.scheduled_at.timestamp())
    base_url = (
        public_base_url
        or os.getenv("PUBLIC_BASE_URL")
        or DEFAULT_PUBLIC_BASE_URL
    ).rstrip("/")
    round_url = (
        f"{base_url}/tournaments/{season_round.tournament_slug}"
        f"?round={season_round.round_number}"
    )
    return (
        "Привет! У нас скоро состоится следующий тур серверной лиги.\n\n"
        f"Тур №{season_round.round_number} – {season_round.name}\n"
        f"Начало: <t:{start_timestamp}:F>\n"
        f"До начала: <t:{start_timestamp}:R>\n"
        "Для участия нужны 10 рейтинговых побед на основной роли и 4 победы "
        "на дополнительной роли.\n"
        f"{round_url}\n\n"
        "Если вы уже зарегистрированы, повторно регистрироваться не нужно. "
        "Не забудьте пройти чек-ин за 2 часа до начала тура."
    )


def is_announcement_recipient(member: discord.Member) -> bool:
    if member.bot:
        return False
    return any(role.id in ANNOUNCEMENT_ROLE_IDS for role in member.roles)


async def fetch_announcement_recipients(
    guild: discord.Guild,
) -> list[discord.Member]:
    recipients = [
        member
        async for member in guild.fetch_members(limit=None)
        if is_announcement_recipient(member)
    ]
    return sorted(recipients, key=lambda member: member.id)


async def deliver_announcement(
    recipients: Sequence[discord.Member],
    message: str,
) -> AnnouncementDeliveryReport:
    sent = 0
    for recipient in recipients:
        try:
            await recipient.send(
                content=message,
                allowed_mentions=discord.AllowedMentions.none(),
            )
            sent += 1
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            continue
    return AnnouncementDeliveryReport(
        total=len(recipients),
        sent=sent,
        failed=len(recipients) - sent,
    )
