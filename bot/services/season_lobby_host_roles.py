from __future__ import annotations

import discord
from discord.ext import commands
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


SEASON_LOBBY_HOST_ROLE_ID = 1261380176894230650


async def sync_season_lobby_host_roles(
    bot: commands.Bot,
    session: AsyncSession,
    guild_id: int,
) -> None:
    """Match the Discord host role to published and recently completed lobbies."""
    guild = bot.get_guild(guild_id)
    if guild is None:
        raise RuntimeError(f"Season host role guild {guild_id} is unavailable")
    role = guild.get_role(SEASON_LOBBY_HOST_ROLE_ID)
    if role is None:
        raise RuntimeError("Season lobby host role is unavailable")

    tracked_result = await session.execute(
        text("SELECT player_id FROM season_lobby_host_role_members")
    )
    tracked_ids = {int(player_id) for player_id in tracked_result.scalars()}
    desired_result = await session.execute(
        text(
            """
            SELECT DISTINCT match.host_player_id
            FROM season_matches AS match
            JOIN season_lobbies AS lobby ON lobby.id = match.lobby_id
            JOIN season_rounds AS round ON round.id = lobby.round_id
            WHERE match.host_player_id IS NOT NULL
              AND match.status <> 'cancelled'
              AND (
                  (round.round_kind = 'regular'
                   AND round.lobby_configuration_status = 'published')
                  OR (round.round_kind = 'finals'
                      AND match.status IN ('published', 'completed'))
              )
              AND (match.status <> 'completed'
                   OR match.host_role_expires_at > NOW())
            """
        )
    )
    desired_ids = {int(player_id) for player_id in desired_result.scalars()}

    for player_id in desired_ids - tracked_ids:
        await session.execute(
            text(
                "INSERT INTO season_lobby_host_role_members (player_id) "
                "VALUES (:player_id) ON CONFLICT DO NOTHING"
            ),
            {"player_id": player_id},
        )

    for player_id in tracked_ids | desired_ids:
        member = guild.get_member(player_id)
        if member is None:
            try:
                member = await guild.fetch_member(player_id)
            except discord.NotFound:
                if player_id not in desired_ids:
                    await session.execute(
                        text(
                            "DELETE FROM season_lobby_host_role_members "
                            "WHERE player_id = :player_id"
                        ),
                        {"player_id": player_id},
                    )
                continue

        has_role = any(member_role.id == role.id for member_role in member.roles)
        should_have_role = player_id in desired_ids
        if should_have_role and not has_role:
            await member.add_roles(role, reason="Season lobby host assigned")
        elif not should_have_role and has_role:
            await member.remove_roles(role, reason="Season lobby host assignment ended")

        if not should_have_role:
            await session.execute(
                text(
                    "DELETE FROM season_lobby_host_role_members "
                    "WHERE player_id = :player_id"
                ),
                {"player_id": player_id},
            )

    await session.commit()
