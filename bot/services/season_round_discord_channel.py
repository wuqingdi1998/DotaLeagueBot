from __future__ import annotations

import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import datetime, timedelta

import discord


ROUND_CHANNEL_LIFETIME = timedelta(hours=3)
ROUND_CHANNEL_TOPIC_PREFIX = "Чат участников тура · season-round:"
OverwriteTarget = discord.Role | discord.Member | discord.Object


@dataclass(frozen=True)
class SeasonRoundDiscordChannelTarget:
    round_id: int
    round_number: int
    round_name: str | None
    scheduled_at: datetime
    discord_channel_id: int | None
    participant_ids: tuple[int, ...]


def season_round_channel_name(round_name: str | None, round_number: int) -> str:
    label = (round_name or f"Тур {round_number}").strip().lower()
    normalized = re.sub(r"[^0-9a-zа-яё]+", "-", label, flags=re.IGNORECASE)
    normalized = re.sub(r"-+", "-", normalized).strip("-")
    fallback = f"тур-{round_number}"
    return (normalized or fallback)[:100].rstrip("-") or fallback


def season_round_channel_topic(round_id: int) -> str:
    return f"{ROUND_CHANNEL_TOPIC_PREFIX}{round_id}"


def season_round_channel_expires_at(scheduled_at: datetime) -> datetime:
    return scheduled_at + ROUND_CHANNEL_LIFETIME


def _copy_overwrite(
    overwrite: discord.PermissionOverwrite | None,
) -> discord.PermissionOverwrite:
    if overwrite is None:
        return discord.PermissionOverwrite()
    allow, deny = overwrite.pair()
    return discord.PermissionOverwrite.from_pair(allow, deny)


def _participant_overwrite(
    overwrite: discord.PermissionOverwrite | None,
) -> discord.PermissionOverwrite:
    participant_overwrite = _copy_overwrite(overwrite)
    participant_overwrite.update(
        view_channel=True,
        send_messages=True,
        read_message_history=True,
    )
    return participant_overwrite


def build_private_round_overwrites(
    base_overwrites: Mapping[OverwriteTarget, discord.PermissionOverwrite],
    default_role: OverwriteTarget,
    participants: Iterable[OverwriteTarget],
) -> dict[OverwriteTarget, discord.PermissionOverwrite]:
    overwrites = {
        target: _copy_overwrite(overwrite)
        for target, overwrite in base_overwrites.items()
    }
    everyone_overwrite = _copy_overwrite(overwrites.get(default_role))
    everyone_overwrite.update(view_channel=False)
    overwrites[default_role] = everyone_overwrite
    for participant in participants:
        overwrites[participant] = _participant_overwrite(
            overwrites.get(participant)
        )
    return overwrites


async def resolve_live_events_category(
    bot: discord.Client, category_id: int
) -> discord.CategoryChannel:
    channel = bot.get_channel(category_id)
    if channel is None:
        channel = await bot.fetch_channel(category_id)
    if not isinstance(channel, discord.CategoryChannel):
        raise RuntimeError(
            f"Discord channel {category_id} is not a text-channel category"
        )
    return channel


async def _registered_members(
    guild: discord.Guild, participant_ids: Iterable[int]
) -> list[discord.Member]:
    members: list[discord.Member] = []
    for participant_id in participant_ids:
        member = guild.get_member(participant_id)
        if member is None:
            try:
                member = await guild.fetch_member(participant_id)
            except (discord.NotFound, discord.Forbidden):
                continue
        members.append(member)
    return members


async def _text_channel(
    guild: discord.Guild, channel_id: int | None
) -> discord.TextChannel | None:
    if channel_id is None:
        return None
    channel = guild.get_channel(channel_id)
    if isinstance(channel, discord.TextChannel):
        return channel
    if channel is not None:
        raise RuntimeError(f"Discord channel {channel_id} is not a text channel")
    try:
        fetched_channel = await guild.fetch_channel(channel_id)
    except discord.NotFound:
        return None
    if isinstance(fetched_channel, discord.TextChannel):
        return fetched_channel
    raise RuntimeError(f"Discord channel {channel_id} is not a text channel")


def _channel_with_round_topic(
    category: discord.CategoryChannel, round_id: int
) -> discord.TextChannel | None:
    expected_topic = season_round_channel_topic(round_id)
    return next(
        (channel for channel in category.text_channels if channel.topic == expected_topic),
        None,
    )


async def ensure_season_round_discord_channel(
    category: discord.CategoryChannel,
    target: SeasonRoundDiscordChannelTarget,
) -> discord.TextChannel:
    guild = category.guild
    members = await _registered_members(guild, target.participant_ids)
    channel = await _text_channel(guild, target.discord_channel_id)
    if channel is None:
        channel = _channel_with_round_topic(category, target.round_id)
    if channel is None:
        channel = await guild.create_text_channel(
            season_round_channel_name(target.round_name, target.round_number),
            category=category,
            topic=season_round_channel_topic(target.round_id),
            overwrites=build_private_round_overwrites(
                category.overwrites, guild.default_role, members
            ),
            reason=f"Первый участник зарегистрировался на тур {target.round_number}",
        )
        return channel

    for member in members:
        current_overwrite = channel.overwrites_for(member)
        if (
            current_overwrite.view_channel is True
            and current_overwrite.send_messages is True
            and current_overwrite.read_message_history is True
        ):
            continue
        await channel.set_permissions(
            member,
            overwrite=_participant_overwrite(current_overwrite),
            reason=f"Участник зарегистрировался на тур {target.round_number}",
        )
    return channel


async def delete_season_round_discord_channel(
    guild: discord.Guild, channel_id: int
) -> None:
    channel = await _text_channel(guild, channel_id)
    if channel is not None:
        await channel.delete(reason="Прошло 3 часа после старта тура")
