from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

import discord


@dataclass(frozen=True)
class TeamVoiceChannelTarget:
    tournament_id: int
    application_id: int
    team_name: str
    discord_channel_id: int | None
    participant_ids: tuple[int, ...]
    managed_participant_ids: tuple[int, ...]


def team_voice_channel_name(team_name: str, application_id: int) -> str:
    normalized = " ".join(team_name.split())
    fallback = f"Команда {application_id}"
    return (normalized or fallback)[:100].rstrip() or fallback


def build_private_voice_overwrites(
    default_role: discord.Role | discord.Object,
    participants: Iterable[discord.Member | discord.Object],
) -> dict[discord.Role | discord.Member | discord.Object, discord.PermissionOverwrite]:
    overwrites: dict[
        discord.Role | discord.Member | discord.Object,
        discord.PermissionOverwrite,
    ] = {
        default_role: discord.PermissionOverwrite(
            view_channel=False,
            connect=False,
        )
    }
    for participant in participants:
        overwrites[participant] = discord.PermissionOverwrite(
            view_channel=True,
            connect=True,
            speak=True,
        )
    return overwrites


async def resolve_team_channels_category(
    bot: discord.Client,
    category_id: int,
) -> discord.CategoryChannel:
    channel = bot.get_channel(category_id)
    if channel is None:
        channel = await bot.fetch_channel(category_id)
    if not isinstance(channel, discord.CategoryChannel):
        raise RuntimeError(f"Discord channel {category_id} is not a category")
    return channel


async def _registered_members(
    guild: discord.Guild,
    participant_ids: Iterable[int],
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


async def _voice_channel(
    guild: discord.Guild,
    channel_id: int | None,
) -> discord.VoiceChannel | None:
    if channel_id is None:
        return None
    channel = guild.get_channel(channel_id)
    if isinstance(channel, discord.VoiceChannel):
        return channel
    if channel is not None:
        raise RuntimeError(f"Discord channel {channel_id} is not a voice channel")
    try:
        fetched_channel = await guild.fetch_channel(channel_id)
    except discord.NotFound:
        return None
    if isinstance(fetched_channel, discord.VoiceChannel):
        return fetched_channel
    raise RuntimeError(f"Discord channel {channel_id} is not a voice channel")


def _has_team_access(overwrite: discord.PermissionOverwrite) -> bool:
    return (
        overwrite.view_channel is True
        and overwrite.connect is True
        and overwrite.speak is True
    )


async def ensure_team_voice_channel(
    category: discord.CategoryChannel,
    target: TeamVoiceChannelTarget,
) -> discord.VoiceChannel | None:
    guild = category.guild
    participants = await _registered_members(guild, target.participant_ids)
    removed_ids = tuple(
        sorted(set(target.managed_participant_ids) - set(target.participant_ids))
    )
    removed_members = await _registered_members(guild, removed_ids)
    channel = await _voice_channel(guild, target.discord_channel_id)
    expected_name = team_voice_channel_name(target.team_name, target.application_id)

    if channel is None:
        if not participants:
            return None
        return await guild.create_voice_channel(
            expected_name,
            category=category,
            overwrites=build_private_voice_overwrites(
                guild.default_role,
                participants,
            ),
            reason=f"Старт турнира: канал команды {target.team_name}",
        )

    everyone_overwrite = channel.overwrites_for(guild.default_role)
    if (
        everyone_overwrite.view_channel is not False
        or everyone_overwrite.connect is not False
    ):
        everyone_overwrite.update(view_channel=False, connect=False)
        await channel.set_permissions(
            guild.default_role,
            overwrite=everyone_overwrite,
            reason="Командный канал закрыт для посторонних",
        )
    for participant in participants:
        current = channel.overwrites_for(participant)
        if _has_team_access(current):
            continue
        current.update(view_channel=True, connect=True, speak=True)
        await channel.set_permissions(
            participant,
            overwrite=current,
            reason=f"Участник команды {target.team_name}",
        )
    for removed_member in removed_members:
        await channel.set_permissions(
            removed_member,
            overwrite=None,
            reason=f"Игрок больше не входит в команду {target.team_name}",
        )
    if channel.name != expected_name:
        await channel.edit(
            name=expected_name,
            reason=f"Обновлено название команды {target.team_name}",
        )
    return channel


async def delete_team_voice_channel(
    guild: discord.Guild,
    channel_id: int,
) -> None:
    channel = await _voice_channel(guild, channel_id)
    if channel is not None:
        await channel.delete(reason="Зафиксирован результат последнего матча турнира")
