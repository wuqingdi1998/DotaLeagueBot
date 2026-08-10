from __future__ import annotations

import os
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Protocol

import discord


class AnnouncementMember(Protocol):
    bot: bool

    async def send(self, message: str) -> object: ...


class AnnouncementGuild(Protocol):
    def fetch_members(
        self,
        *,
        limit: int | None,
    ) -> AsyncIterator[AnnouncementMember]: ...


@dataclass(frozen=True)
class CompendiumAnnouncementReport:
    sent_count: int
    failed_count: int
    skipped_bot_count: int


def compendium_announcement_text() -> str:
    public_base_url = (
        os.getenv("PUBLIC_BASE_URL") or "https://lsesports.ru"
    ).rstrip("/")
    return (
        "На сервере началась Гонка за звёздами! Выполняй ежедневные испытания, "
        "лидеры недельного рейтинга выигрывают коллекционные сеты. "
        f"Компендиум: {public_base_url}/compendium"
    )


async def broadcast_compendium_announcement(
    guild: AnnouncementGuild,
) -> CompendiumAnnouncementReport:
    message = compendium_announcement_text()
    sent_count = 0
    failed_count = 0
    skipped_bot_count = 0

    async for member in guild.fetch_members(limit=None):
        if member.bot:
            skipped_bot_count += 1
            continue
        try:
            await member.send(message)
        except discord.HTTPException:
            failed_count += 1
        else:
            sent_count += 1

    return CompendiumAnnouncementReport(
        sent_count=sent_count,
        failed_count=failed_count,
        skipped_bot_count=skipped_bot_count,
    )
