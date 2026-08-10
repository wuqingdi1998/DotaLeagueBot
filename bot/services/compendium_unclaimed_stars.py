from __future__ import annotations

import os
from dataclasses import dataclass

import aiohttp
import discord


class CompendiumUnclaimedStarsError(RuntimeError):
    pass


@dataclass(frozen=True)
class UnclaimedStarRacePlayer:
    player_name: str
    hero_name: str
    match_id: str


@dataclass(frozen=True)
class UnclaimedStarRaceReport:
    is_available: bool
    date_key: str
    quest_title: str | None
    checked_count: int
    failed_count: int
    players: tuple[UnclaimedStarRacePlayer, ...]


def _request_settings() -> tuple[str, str, str]:
    secret = (
        os.getenv("COMPENDIUM_SCHEDULER_SECRET")
        or os.getenv("DISCORD_TOKEN")
        or ""
    ).strip()
    site_url = (
        os.getenv("COMPENDIUM_SITE_URL")
        or os.getenv("PUBLIC_BASE_URL")
        or ""
    ).rstrip("/")
    public_origin = (os.getenv("PUBLIC_BASE_URL") or site_url).rstrip("/")
    if len(secret) < 24 or not site_url:
        raise CompendiumUnclaimedStarsError(
            "Связь бота с сайтом для проверки компендиума не настроена."
        )
    return site_url, public_origin, secret


def _report_from_payload(payload: object) -> UnclaimedStarRaceReport:
    if not isinstance(payload, dict) or payload.get("ok") is not True:
        raise CompendiumUnclaimedStarsError("Сайт вернул некорректный результат проверки.")
    raw_players = payload.get("players")
    if not isinstance(raw_players, list):
        raise CompendiumUnclaimedStarsError("Сайт не вернул список участников.")
    try:
        players = tuple(
            UnclaimedStarRacePlayer(
                player_name=str(player["playerName"]),
                hero_name=str(player["heroName"]),
                match_id=str(player["matchId"]),
            )
            for player in raw_players
            if isinstance(player, dict)
        )
        return UnclaimedStarRaceReport(
            is_available=bool(payload["isAvailable"]),
            date_key=str(payload["dateKey"]),
            quest_title=(
                str(payload["questTitle"])
                if payload.get("questTitle") is not None
                else None
            ),
            checked_count=int(payload["checkedCount"]),
            failed_count=int(payload["failedCount"]),
            players=players,
        )
    except (KeyError, TypeError, ValueError) as error:
        raise CompendiumUnclaimedStarsError(
            "Сайт вернул неполный результат проверки."
        ) from error


async def request_unclaimed_star_race_report() -> UnclaimedStarRaceReport:
    site_url, public_origin, secret = _request_settings()
    timeout = aiohttp.ClientTimeout(total=600)
    headers = {
        "Authorization": f"Bearer {secret}",
        "Origin": public_origin,
    }
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                f"{site_url}/api/internal/compendium/unclaimed-star-race",
                headers=headers,
            ) as response:
                if response.status != 200:
                    raise CompendiumUnclaimedStarsError(
                        f"Сайт не смог выполнить проверку: HTTP {response.status}."
                    )
                return _report_from_payload(await response.json())
    except CompendiumUnclaimedStarsError:
        raise
    except (aiohttp.ClientError, TimeoutError, ValueError) as error:
        raise CompendiumUnclaimedStarsError(
            "Не удалось получить результаты проверки с сайта."
        ) from error


def format_unclaimed_star_race_report(
    report: UnclaimedStarRaceReport,
) -> list[str]:
    if not report.is_available:
        return [
            f"ℹ️ За **{report.date_key}** нет активного задания Гонки за звёздами "
            "на победу указанным героем."
        ]

    title = report.quest_title or "Задание дня"
    header = (
        f"⭐ **Не получившие награду — {title} ({report.date_key})**\n"
        "Условие выполнено, но кнопка «Проверить» ещё не нажата."
    )
    summary = (
        f"Проверено участников: **{report.checked_count}**. "
        f"Не удалось проверить: **{report.failed_count}**."
    )
    if not report.players:
        return [f"{header}\n\n✅ Таких участников не найдено.\n{summary}"]

    lines = [
        f"• {discord.utils.escape_markdown(player.player_name)} — "
        f"{discord.utils.escape_markdown(player.hero_name)} · "
        f"[матч {player.match_id}](https://www.opendota.com/matches/{player.match_id})"
        for player in report.players
    ]
    messages: list[str] = []
    current = header
    for line in lines:
        candidate = f"{current}\n{line}"
        if len(candidate) > 1900:
            messages.append(current)
            current = line
        else:
            current = candidate
    if len(f"{current}\n\n{summary}") <= 2000:
        current = f"{current}\n\n{summary}"
    else:
        messages.append(current)
        current = summary
    messages.append(current)
    return messages
