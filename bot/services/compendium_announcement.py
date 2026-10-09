from __future__ import annotations

import os
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass
from typing import Protocol

import discord


class AnnouncementAudienceMember(Protocol):
    @property
    def bot(self) -> bool: ...

    @property
    def roles(self) -> Sequence[object]: ...


class AnnouncementMember(AnnouncementAudienceMember, Protocol):

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
    skipped_excluded_count: int


COMPENDIUM_EXCLUDED_ROLE_NAME = "Массовка"


def is_compendium_announcement_recipient(
    member: AnnouncementAudienceMember,
) -> bool:
    if member.bot:
        return False
    return all(
        getattr(role, "name", None) != COMPENDIUM_EXCLUDED_ROLE_NAME
        for role in member.roles
    )


def compendium_announcement_text(*, is_current: bool = False) -> str:
    public_base_url = (
        os.getenv("PUBLIC_BASE_URL") or "https://lsesports.ru"
    ).rstrip("/")
    clan_instructions = (
        "Распределение кланов завершено. Ваш клан и текущие результаты доступны на сайте. "
        "Новые допущенные участники получают клан после регистрации."
        if is_current else
        "Компендиум уже открыт к просмотру. До 4 октября 23:30 МСК владельцы подписки Суппортер "
        "и цветных Рун, кроме Руны Воды, смогут выбрать клан на сайте и забронировать себе место "
        "в одном из них. Остальных допущенных участников система распределит автоматически."
    )
    return f"""**КОМПЕНДИУМ LINKEN'S SPHERE ESPORTS**

С 5 по 25 октября участники сервера разделятся на два клана – **Морбус** и **Панацея** – и будут зарабатывать звёзды для себя и своих соклановцев. Общая ценность всех призов компендиума **~ 20 000 ₽**.

**Как попасть в клан**
{clan_instructions}

**Как зарабатывать звёзды**
• выполнять ежедневные испытания героев;
• побеждать в рейтинговой игре вместе с участником своего клана;
• выполнять задания «Гонки за звёздами»;
• играть и побеждать на картах в 6-м, 7-м и 8-м турах сезонной лиги;
• участвовать в турнирах – Fastcup #14 и CD Fastcup #8.
Для подписчиков цветных Рун и «Суппортеров» доступно Испытание Рун. По субботам и воскресеньям награда за ежедневные задания и клановую вылазку удваивается. Испытания обновляются в 00:00 МСК.

**Как получить призы**
Каждая звезда даёт дополнительный шанс в финальном розыгрыше. Клан-победитель разыграет среди своих участников **21 приз**, второй клан – **9 призов**. Лидеры еженедельной «Гонки за звёздами» получат отдельные награды. За личный прогресс также выдаются постоянные клановые бейджи и дополнительные замены заданий.

К участию допускаются только участники, зарегистрированные через канал **#регистрация**. Роль **«Массовка»** в Компендиуме не участвует. Чтобы открыть страницу, нужно войти на сайт через Discord.

**Компендиум:** {public_base_url}/compendium"""


async def broadcast_compendium_announcement(
    guild: AnnouncementGuild,
) -> CompendiumAnnouncementReport:
    message = compendium_announcement_text(is_current=True)
    sent_count = 0
    failed_count = 0
    skipped_bot_count = 0
    skipped_excluded_count = 0

    async for member in guild.fetch_members(limit=None):
        if member.bot:
            skipped_bot_count += 1
            continue
        if not is_compendium_announcement_recipient(member):
            skipped_excluded_count += 1
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
        skipped_excluded_count=skipped_excluded_count,
    )
