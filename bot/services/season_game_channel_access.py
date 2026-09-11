from __future__ import annotations

import os
from datetime import datetime

import discord
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


SEASON_GAME_CHANNELS_CATEGORY_ID = int(
    os.getenv("SEASON_GAME_CHANNELS_CATEGORY_ID") or "1074320720680714270"
)


def category_visibility_overwrite(
    current: discord.PermissionOverwrite,
    *,
    is_public: bool,
) -> discord.PermissionOverwrite:
    allow, deny = current.pair()
    updated = discord.PermissionOverwrite.from_pair(allow, deny)
    updated.update(view_channel=is_public)
    return updated


async def resolve_game_channels_category(
    bot: discord.Client,
) -> discord.CategoryChannel:
    channel = bot.get_channel(SEASON_GAME_CHANNELS_CATEGORY_ID)
    if channel is None:
        channel = await bot.fetch_channel(SEASON_GAME_CHANNELS_CATEGORY_ID)
    if not isinstance(channel, discord.CategoryChannel):
        raise RuntimeError(
            f"Discord channel {SEASON_GAME_CHANNELS_CATEGORY_ID} "
            "is not a category"
        )
    return channel


async def set_category_public(
    category: discord.CategoryChannel,
    *,
    is_public: bool,
) -> None:
    everyone = category.guild.default_role
    overwrite = category_visibility_overwrite(
        category.overwrites_for(everyone),
        is_public=is_public,
    )
    action = "отправлены данные лобби" if is_public else "завершены все лобби тура"
    await category.set_permissions(
        everyone,
        overwrite=overwrite,
        reason=f"Игровые каналы лиги: {action}",
    )


async def open_category_for_due_host_notifications(
    bot: discord.Client,
    session: AsyncSession,
) -> int:
    result = await session.execute(
        text(
            """
            SELECT DISTINCT round.id::bigint
            FROM season_lobby_notification_outbox notification
            JOIN season_matches match ON match.id = notification.match_id
            JOIN season_lobbies lobby ON lobby.id = match.lobby_id
            JOIN season_rounds round ON round.id = lobby.round_id
            LEFT JOIN season_game_channel_access_windows access
              ON access.round_id = round.id
            WHERE notification.audience = 'host'
              AND notification.status = 'pending'
              AND notification.scheduled_for <= NOW()
              AND access.opened_at IS NULL
            ORDER BY round.id
            """
        )
    )
    round_ids = tuple(int(row["id"]) for row in result.mappings().all())
    if not round_ids:
        return 0

    category = await resolve_game_channels_category(bot)
    await set_category_public(category, is_public=True)
    await session.execute(
        text(
            """
            INSERT INTO season_game_channel_access_windows (round_id, opened_at)
            SELECT round_id, NOW()
            FROM UNNEST(CAST(:round_ids AS BIGINT[])) round_id
            ON CONFLICT (round_id) DO UPDATE
            SET opened_at = COALESCE(
                    season_game_channel_access_windows.opened_at,
                    EXCLUDED.opened_at
                ),
                updated_at = NOW()
            WHERE season_game_channel_access_windows.closed_at IS NULL
            """
        ),
        {"round_ids": list(round_ids)},
    )
    await session.commit()
    return len(round_ids)


async def close_category_after_completed_rounds(
    bot: discord.Client,
    session: AsyncSession,
) -> int:
    result = await session.execute(
        text(
            """
            SELECT round_id::bigint
            FROM season_game_channel_access_windows
            WHERE opened_at IS NOT NULL
              AND closed_at IS NULL
              AND close_scheduled_for <= NOW()
            ORDER BY close_scheduled_for, round_id
            FOR UPDATE
            """
        )
    )
    due_round_ids = tuple(
        int(row["round_id"]) for row in result.mappings().all()
    )
    if not due_round_ids:
        return 0

    active_result = await session.execute(
        text(
            """
            SELECT EXISTS (
                SELECT 1
                FROM season_game_channel_access_windows
                WHERE opened_at IS NOT NULL
                  AND closed_at IS NULL
                  AND NOT (round_id = ANY(CAST(:round_ids AS BIGINT[])))
            )
            """
        ),
        {"round_ids": list(due_round_ids)},
    )
    has_other_active_round = bool(active_result.scalar_one())
    if not has_other_active_round:
        category = await resolve_game_channels_category(bot)
        await set_category_public(category, is_public=False)

    await session.execute(
        text(
            """
            UPDATE season_game_channel_access_windows
            SET closed_at = NOW(), updated_at = NOW()
            WHERE round_id = ANY(CAST(:round_ids AS BIGINT[]))
              AND closed_at IS NULL
            """
        ),
        {"round_ids": list(due_round_ids)},
    )
    await session.commit()
    return len(due_round_ids)


async def next_season_game_category_change_at(
    session: AsyncSession,
) -> datetime | None:
    result = await session.execute(
        text(
            """
            SELECT MIN(close_scheduled_for)
            FROM season_game_channel_access_windows
            WHERE opened_at IS NOT NULL
              AND closed_at IS NULL
              AND close_scheduled_for IS NOT NULL
            """
        )
    )
    return result.scalar_one_or_none()
