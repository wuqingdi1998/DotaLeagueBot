from __future__ import annotations

import asyncio
import os

import discord
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.season_round_discord_channel import (
    SeasonRoundDiscordChannelTarget,
    delete_season_round_discord_channel,
    ensure_season_round_discord_channel,
    resolve_live_events_category,
)


LIVE_EVENTS_CATEGORY_ID = int(
    os.getenv("LIVE_EVENTS_CATEGORY_ID") or "1211809315464159242"
)


async def _delete_expired_round_channels(
    session: AsyncSession,
    category: discord.CategoryChannel,
) -> None:
    result = await session.execute(
        text(
            """
            SELECT id::int, discord_channel_id
            FROM season_rounds
            WHERE discord_channel_id IS NOT NULL
              AND scheduled_at IS NOT NULL
              AND NOW() >= scheduled_at + INTERVAL '3 hours'
            ORDER BY scheduled_at, id
            FOR UPDATE SKIP LOCKED
            """
        )
    )
    for round_row in result.mappings():
        try:
            await delete_season_round_discord_channel(
                category.guild, int(round_row["discord_channel_id"])
            )
            await session.execute(
                text(
                    """
                    UPDATE season_rounds
                    SET discord_channel_id = NULL
                    WHERE id = :round_id
                      AND discord_channel_id = :channel_id
                    """
                ),
                {
                    "round_id": round_row["id"],
                    "channel_id": round_row["discord_channel_id"],
                },
            )
            await session.execute(
                text(
                    """
                    DELETE FROM season_round_discord_channel_members
                    WHERE round_id = :round_id
                    """
                ),
                {"round_id": round_row["id"]},
            )
        except (discord.HTTPException, asyncio.TimeoutError, RuntimeError) as error:
            print(
                "[ROUND-CHANNELS] Failed to delete channel "
                f"for round {round_row['id']}: {error}"
            )


async def _replace_managed_members(
    session: AsyncSession,
    round_id: int,
    participant_ids: tuple[int, ...],
) -> None:
    parameters = {
        "round_id": round_id,
        "participant_ids": list(participant_ids),
    }
    await session.execute(
        text(
            """
            DELETE FROM season_round_discord_channel_members
            WHERE round_id = :round_id
              AND NOT (
                  player_id = ANY(CAST(:participant_ids AS BIGINT[]))
              )
            """
        ),
        parameters,
    )
    await session.execute(
        text(
            """
            INSERT INTO season_round_discord_channel_members
                (round_id, player_id)
            SELECT :round_id, participant_id
            FROM UNNEST(CAST(:participant_ids AS BIGINT[])) participant_id
            ON CONFLICT (round_id, player_id) DO NOTHING
            """
        ),
        parameters,
    )


async def _ensure_active_round_channels(
    session: AsyncSession,
    category: discord.CategoryChannel,
) -> None:
    result = await session.execute(
        text(
            """
            SELECT round.id::int,
                   round.round_number::int,
                   round.name,
                   round.scheduled_at,
                   round.discord_channel_id,
                   ARRAY(
                       SELECT registration.player_id
                       FROM season_round_registrations registration
                       WHERE registration.round_id = round.id
                       ORDER BY registration.created_at,
                                registration.player_id
                   ) AS participant_ids,
                   ARRAY(
                       SELECT membership.player_id
                       FROM season_round_discord_channel_members membership
                       WHERE membership.round_id = round.id
                       ORDER BY membership.player_id
                   ) AS managed_participant_ids
            FROM season_rounds round
            WHERE round.scheduled_at IS NOT NULL
              AND NOW() < round.scheduled_at + INTERVAL '3 hours'
              AND (
                  round.discord_channel_id IS NOT NULL
                  OR (
                      round.status <> 'cancelled'
                      AND EXISTS (
                          SELECT 1
                          FROM season_round_registrations registration
                          WHERE registration.round_id = round.id
                      )
                  )
              )
            ORDER BY round.scheduled_at, round.id
            """
        )
    )
    for round_row in result.mappings():
        target = SeasonRoundDiscordChannelTarget(
            round_id=round_row["id"],
            round_number=round_row["round_number"],
            round_name=round_row["name"],
            scheduled_at=round_row["scheduled_at"],
            discord_channel_id=round_row["discord_channel_id"],
            participant_ids=tuple(round_row["participant_ids"]),
            managed_participant_ids=tuple(round_row["managed_participant_ids"]),
        )
        try:
            channel = await ensure_season_round_discord_channel(category, target)
            channel_id = channel.id if channel is not None else None
            if channel_id != target.discord_channel_id:
                await session.execute(
                    text(
                        """
                        UPDATE season_rounds
                        SET discord_channel_id = :channel_id
                        WHERE id = :round_id
                        """
                    ),
                    {"round_id": target.round_id, "channel_id": channel_id},
                )
            await _replace_managed_members(
                session, target.round_id, target.participant_ids
            )
        except (discord.HTTPException, asyncio.TimeoutError, RuntimeError) as error:
            print(
                "[ROUND-CHANNELS] Failed to sync channel "
                f"for round {target.round_id}: {error}"
            )


async def sync_season_round_discord_channels(
    bot: discord.Client,
    session: AsyncSession,
) -> None:
    try:
        category = await resolve_live_events_category(
            bot, LIVE_EVENTS_CATEGORY_ID
        )
    except (discord.HTTPException, asyncio.TimeoutError, RuntimeError) as error:
        print(f"[ROUND-CHANNELS] Live events category is unavailable: {error}")
        return
    await _delete_expired_round_channels(session, category)
    await _ensure_active_round_channels(session, category)
