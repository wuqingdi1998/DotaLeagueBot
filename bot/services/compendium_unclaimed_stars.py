from __future__ import annotations

import os
from dataclasses import dataclass

import aiohttp
import discord


class CompendiumUnclaimedStarsError(RuntimeError):
    pass


@dataclass(frozen=True)
class UnclaimedChallenge:
    kind: str
    title: str
    detail: str
    match_ids: tuple[str, ...]


@dataclass(frozen=True)
class UnclaimedChallengePlayer:
    player_name: str
    challenges: tuple[UnclaimedChallenge, ...]


@dataclass(frozen=True)
class UnclaimedChallengesReport:
    date_key: str
    checked_count: int
    failed_count: int
    players: tuple[UnclaimedChallengePlayer, ...]


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


def _challenge_from_payload(payload: object) -> UnclaimedChallenge:
    if not isinstance(payload, dict):
        raise CompendiumUnclaimedStarsError("Сайт вернул неполный результат проверки.")
    match_ids = payload.get("matchIds")
    if not isinstance(match_ids, list):
        raise CompendiumUnclaimedStarsError("Сайт не вернул список матчей.")
    try:
        return UnclaimedChallenge(
            kind=str(payload["kind"]),
            title=str(payload["title"]),
            detail=str(payload["detail"]),
            match_ids=tuple(str(match_id) for match_id in match_ids),
        )
    except (KeyError, TypeError, ValueError) as error:
        raise CompendiumUnclaimedStarsError(
            "Сайт вернул неполный результат проверки."
        ) from error


def _report_from_payload(payload: object) -> UnclaimedChallengesReport:
    if not isinstance(payload, dict) or payload.get("ok") is not True:
        raise CompendiumUnclaimedStarsError("Сайт вернул некорректный результат проверки.")
    raw_players = payload.get("players")
    if not isinstance(raw_players, list):
        raise CompendiumUnclaimedStarsError("Сайт не вернул список участников.")
    try:
        players = tuple(
            UnclaimedChallengePlayer(
                player_name=str(player["playerName"]),
                challenges=tuple(
                    _challenge_from_payload(challenge)
                    for challenge in player["challenges"]
                ),
            )
            for player in raw_players
            if isinstance(player, dict) and isinstance(player.get("challenges"), list)
        )
        return UnclaimedChallengesReport(
            date_key=str(payload["dateKey"]),
            checked_count=int(payload["checkedCount"]),
            failed_count=int(payload["failedCount"]),
            players=players,
        )
    except (KeyError, TypeError, ValueError) as error:
        raise CompendiumUnclaimedStarsError(
            "Сайт вернул неполный результат проверки."
        ) from error


async def request_unclaimed_challenges_report() -> UnclaimedChallengesReport:
    site_url, public_origin, secret = _request_settings()
    timeout = aiohttp.ClientTimeout(total=600)
    headers = {
        "Authorization": f"Bearer {secret}",
        "Origin": public_origin,
    }
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                f"{site_url}/api/internal/compendium/unclaimed-challenges",
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


def _match_links(match_ids: tuple[str, ...]) -> str:
    return ", ".join(
        f"[матч {match_id}](https://www.opendota.com/matches/{match_id})"
        for match_id in match_ids
    )


def _report_lines(report: UnclaimedChallengesReport) -> list[str]:
    lines: list[str] = []
    for player in report.players:
        lines.append(f"• **{discord.utils.escape_markdown(player.player_name)}**")
        for challenge in player.challenges:
            title = discord.utils.escape_markdown(challenge.title)
            detail = discord.utils.escape_markdown(challenge.detail)
            links = _match_links(challenge.match_ids)
            suffix = f" · {links}" if links else ""
            lines.append(f"  - {title} — {detail}{suffix}")
    return lines


def format_unclaimed_challenges_report(
    report: UnclaimedChallengesReport,
) -> list[str]:
    header = (
        f"⭐ **Выполненные, но не засчитанные испытания — {report.date_key}**\n"
        "Условие выполнено, но кнопка «Проверить» ещё не нажата."
    )
    summary = (
        f"Проверено участников: **{report.checked_count}**. "
        f"Не удалось проверить: **{report.failed_count}**."
    )
    lines = _report_lines(report)
    if not lines:
        return [
            f"{header}\n\n✅ Выполненных, но не засчитанных испытаний "
            f"не найдено.\n{summary}"
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
