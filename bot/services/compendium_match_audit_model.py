from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import discord


AUDIT_CHANNEL_ID = 1471130762282536980
ALLOWED_MATCH_REGIONS = frozenset({3, 8, 28})
DATA_DIRECTORY = Path(__file__).resolve().parents[1] / "data" / "opendota"
REGIONS = json.loads((DATA_DIRECTORY / "region.json").read_text(encoding="utf-8"))
CLUSTERS = json.loads((DATA_DIRECTORY / "cluster.json").read_text(encoding="utf-8"))
AUDIT_SOURCES = {
    "compendium_user_quest_completions": "Задания дня",
    "compendium_rune_challenge_completions": "Испытание Рун",
    "october_compendium_rune_challenge_completions": "Испытание Рун",
    "october_compendium_clan_outing_completions": "Клановая вылазка",
    "compendium_star_race_quest_wins": "Гонка за звёздами",
    "compendium_star_race_quest_progress_wins": "Прогресс гонки",
    "star_race_progress": "Прогресс гонки",
}


def match_region(details: dict[str, Any]) -> int | None:
    cluster = details.get("cluster")
    known_region = CLUSTERS.get(str(cluster))
    if known_region is not None:
        return int(known_region)
    region = details.get("region")
    return region if type(region) is int and region > 0 else None


def validated_match_details(payload: Any, match_id: int) -> dict[str, Any]:
    if not isinstance(payload, dict) or str(payload.get("match_id")) != str(match_id):
        raise ValueError("OpenDota returned another or invalid match")
    if match_region(payload) is None:
        raise ValueError("OpenDota has not provided a server region yet")
    players = payload.get("players")
    if not isinstance(players, list) or not players:
        raise ValueError("OpenDota has not provided match participants yet")
    if any(not isinstance(player, dict) for player in players):
        raise ValueError("OpenDota returned invalid match participants")
    return {
        "match_id": match_id,
        "region": match_region(payload),
        "cluster": payload.get("cluster"),
        "players": [
            {"account_id": player.get("account_id"), "player_slot": player.get("player_slot")}
            for player in players
        ],
    }


def _safe_name(value: object) -> str:
    return discord.utils.escape_markdown(str(value or "Без ника")[:80])


def audit_message(audit: Any, details: dict[str, Any]) -> discord.Embed:
    region = match_region(details)
    server = REGIONS.get(str(region), f"Неизвестный регион {region}")
    players = {str(player["account_id"]): player for player in details["players"]
               if player.get("account_id") is not None}
    clan_mates = []
    for mate in audit["clan_mates"]:
        participant = players.get(str(mate.get("dota_id")))
        if participant is None:
            continue
        slot = participant.get("player_slot")
        side = "Radiant" if type(slot) is int and slot < 128 else "Dire"
        if type(slot) is not int:
            side = "сторона неизвестна"
        clan_mates.append(f"{_safe_name(mate['name'])} ({mate['player_id']}, {side})")
    clan_text = "\n".join(clan_mates) if clan_mates else "Не найдены среди открытых аккаунтов."
    if any(player.get("account_id") is None for player in details["players"]):
        clan_text += "\nЕсть скрытые аккаунты – список может быть неполным."
    embed = discord.Embed(
        title="Компендиум: засчитан матч вне разрешённых регионов",
        description=(f"Игрок: **{_safe_name(audit['player_name'])}** "
                     f"(Discord ID: {audit['player_id']})\n"
                     f"Матч: https://www.opendota.com/matches/{audit['match_id']}\n"
                     f"Сервер: **{server}**, регион {region}, кластер {details.get('cluster', 'неизвестен')}\n"
                     "Матч засчитан. Уведомление предназначено для проверки."),
        color=discord.Color.orange(),
    )
    for offset in range(0, len(clan_text), 1024):
        embed.add_field(
            name="Другие участники его клана в матче" if offset == 0 else "Участники клана (продолжение)",
            value=clan_text[offset:offset + 1024], inline=False,
        )
    source = AUDIT_SOURCES.get(audit["source"], "Проверка матча")
    embed.set_footer(text=f"Проверка #{audit['id']} · {source}")
    return embed
