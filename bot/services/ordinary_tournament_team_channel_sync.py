from __future__ import annotations

import asyncio
import os
from datetime import datetime

import discord
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.ordinary_tournament_team_channels import (
    TeamVoiceChannelTarget,
    delete_team_voice_channel,
    ensure_team_voice_channel,
    resolve_team_channels_category,
)


ORDINARY_TEAM_CHANNELS_CATEGORY_ID = int(
    os.getenv("ORDINARY_TEAM_CHANNELS_CATEGORY_ID") or "1548371015027925042"
)


async def _open_due_tournaments(session: AsyncSession) -> int:
    result = await session.execute(
        text(
            """
            INSERT INTO ordinary_tournament_team_channel_access
                (tournament_id, opened_at)
            SELECT tournament.id, NOW()
            FROM tournaments tournament
            WHERE tournament.tournament_type = 'ordinary'
              AND tournament.status IN ('planned', 'registration', 'active')
              AND tournament.start_at <= NOW()
              AND NOT EXISTS (
                  SELECT 1
                  FROM ordinary_tournament_team_channel_access access
                  WHERE access.tournament_id = tournament.id
              )
            ON CONFLICT (tournament_id) DO NOTHING
            RETURNING tournament_id
            """
        )
    )
    opened_count = len(result.all())
    if opened_count:
        await session.commit()
    return opened_count


async def _completed_tournament_ids(session: AsyncSession) -> tuple[int, ...]:
    result = await session.execute(
        text(
            """
            SELECT access.tournament_id::bigint
            FROM ordinary_tournament_team_channel_access access
            WHERE access.closed_at IS NULL
              AND EXISTS (
                  SELECT 1 FROM tournament_matches match
                  WHERE match.tournament_id = access.tournament_id
                    AND match.status = 'finished'
              )
              AND NOT EXISTS (
                  SELECT 1 FROM tournament_matches match
                  WHERE match.tournament_id = access.tournament_id
                    AND match.status NOT IN ('finished', 'cancelled')
              )
            ORDER BY access.tournament_id
            FOR UPDATE
            """
        )
    )
    return tuple(int(row[0]) for row in result.all())


async def _close_completed_tournaments(
    session: AsyncSession,
    category: discord.CategoryChannel,
    tournament_ids: tuple[int, ...],
) -> int:
    failure_count = 0
    for tournament_id in tournament_ids:
        result = await session.execute(
            text(
                """
                SELECT discord_channel_id
                FROM ordinary_tournament_team_channels
                WHERE tournament_id = :tournament_id
                  AND discord_channel_id IS NOT NULL
                ORDER BY application_id
                """
            ),
            {"tournament_id": tournament_id},
        )
        try:
            for channel_id in result.scalars():
                await delete_team_voice_channel(category.guild, int(channel_id))
        except (discord.HTTPException, asyncio.TimeoutError, RuntimeError) as error:
            failure_count += 1
            print(
                "[TEAM-CHANNELS] Failed to close tournament "
                f"{tournament_id}: {error}"
            )
            continue
        await session.execute(
            text(
                """
                UPDATE ordinary_tournament_team_channel_access
                SET closed_at = NOW(), updated_at = NOW()
                WHERE tournament_id = :tournament_id
                  AND closed_at IS NULL
                """
            ),
            {"tournament_id": tournament_id},
        )
        await session.commit()
    return failure_count


async def _active_team_targets(
    session: AsyncSession,
) -> tuple[TeamVoiceChannelTarget, ...]:
    result = await session.execute(
        text(
            """
            SELECT tournament.id::bigint AS tournament_id,
                   application.id::bigint AS application_id,
                   application.team_name,
                   channel.discord_channel_id,
                   ARRAY(
                       SELECT member.player_id
                       FROM tournament_team_members member
                       WHERE member.application_id = application.id
                         AND member.invitation_status = 'accepted'
                       ORDER BY member.player_id
                   ) AS participant_ids,
                   ARRAY(
                       SELECT membership.player_id
                       FROM ordinary_tournament_team_channel_members membership
                       WHERE membership.application_id = application.id
                       ORDER BY membership.player_id
                   ) AS managed_participant_ids
            FROM ordinary_tournament_team_channel_access access
            JOIN tournaments tournament ON tournament.id = access.tournament_id
            JOIN tournament_team_applications application
              ON application.tournament_id = tournament.id
             AND application.status = 'approved'
            LEFT JOIN ordinary_tournament_team_channels channel
              ON channel.application_id = application.id
            WHERE access.closed_at IS NULL
            ORDER BY tournament.start_at, application.created_at, application.id
            """
        )
    )
    return tuple(
        TeamVoiceChannelTarget(
            tournament_id=int(row["tournament_id"]),
            application_id=int(row["application_id"]),
            team_name=str(row["team_name"]),
            discord_channel_id=(
                int(row["discord_channel_id"])
                if row["discord_channel_id"] is not None
                else None
            ),
            participant_ids=tuple(int(value) for value in row["participant_ids"]),
            managed_participant_ids=tuple(
                int(value) for value in row["managed_participant_ids"]
            ),
        )
        for row in result.mappings()
    )


async def _save_team_channel(
    session: AsyncSession,
    target: TeamVoiceChannelTarget,
    channel_id: int,
) -> None:
    parameters = {
        "application_id": target.application_id,
        "tournament_id": target.tournament_id,
        "channel_id": channel_id,
        "participant_ids": list(target.participant_ids),
    }
    await session.execute(
        text(
            """
            INSERT INTO ordinary_tournament_team_channels
                (application_id, tournament_id, discord_channel_id)
            VALUES (:application_id, :tournament_id, :channel_id)
            ON CONFLICT (application_id) DO UPDATE
            SET discord_channel_id = EXCLUDED.discord_channel_id,
                updated_at = NOW()
            """
        ),
        parameters,
    )
    await session.execute(
        text(
            """
            DELETE FROM ordinary_tournament_team_channel_members
            WHERE application_id = :application_id
              AND NOT (player_id = ANY(CAST(:participant_ids AS BIGINT[])))
            """
        ),
        parameters,
    )
    await session.execute(
        text(
            """
            INSERT INTO ordinary_tournament_team_channel_members
                (application_id, player_id)
            SELECT :application_id, player_id
            FROM UNNEST(CAST(:participant_ids AS BIGINT[])) player_id
            ON CONFLICT (application_id, player_id) DO NOTHING
            """
        ),
        parameters,
    )


async def _ensure_active_team_channels(
    session: AsyncSession,
    category: discord.CategoryChannel,
) -> int:
    failure_count = 0
    for target in await _active_team_targets(session):
        try:
            channel = await ensure_team_voice_channel(category, target)
            if channel is None:
                continue
            await _save_team_channel(session, target, channel.id)
            await session.commit()
        except (discord.HTTPException, asyncio.TimeoutError, RuntimeError) as error:
            failure_count += 1
            print(
                "[TEAM-CHANNELS] Failed to sync team "
                f"{target.application_id}: {error}"
            )
            await session.rollback()
    return failure_count


async def sync_ordinary_tournament_team_channels(
    bot: discord.Client,
    session: AsyncSession,
) -> int:
    opened_count = await _open_due_tournaments(session)
    completed_ids = await _completed_tournament_ids(session)
    targets = await _active_team_targets(session)
    if not opened_count and not completed_ids and not targets:
        return 0
    category = await resolve_team_channels_category(
        bot,
        ORDINARY_TEAM_CHANNELS_CATEGORY_ID,
    )
    close_failures = await _close_completed_tournaments(
        session,
        category,
        completed_ids,
    )
    ensure_failures = await _ensure_active_team_channels(session, category)
    return close_failures + ensure_failures


async def next_ordinary_tournament_team_channel_change_at(
    session: AsyncSession,
) -> datetime | None:
    result = await session.execute(
        text(
            """
            SELECT MIN(tournament.start_at)
            FROM tournaments tournament
            WHERE tournament.tournament_type = 'ordinary'
              AND tournament.status IN ('planned', 'registration', 'active')
              AND tournament.start_at > NOW()
              AND NOT EXISTS (
                  SELECT 1
                  FROM ordinary_tournament_team_channel_access access
                  WHERE access.tournament_id = tournament.id
              )
            """
        )
    )
    return result.scalar_one_or_none()
