import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def sync_october_server_membership(
    session: AsyncSession, present_player_ids: list[int],
    snapshot_started_at: datetime.datetime,
) -> int:
    """Apply only a complete Discord member list; absent players lose clans and stars."""
    result = await session.execute(
        text("""
            INSERT INTO october_compendium_server_membership
                (player_id, is_present, stars_reset_at, checked_at)
            SELECT discord_id, discord_id = ANY(:present_ids),
                CASE WHEN discord_id = ANY(:present_ids) THEN NULL ELSE NOW() END,
                NOW()
            FROM players WHERE discord_id > 0
            ON CONFLICT (player_id) DO UPDATE
            SET is_present = EXCLUDED.is_present,
                stars_reset_at = CASE
                    WHEN EXCLUDED.is_present <> october_compendium_server_membership.is_present
                    THEN NOW()
                    ELSE october_compendium_server_membership.stars_reset_at
                END,
                checked_at = NOW()
            WHERE october_compendium_server_membership.checked_at <= :snapshot_started_at
            RETURNING is_present
        """),
        {"present_ids": present_player_ids, "snapshot_started_at": snapshot_started_at},
    )
    absent_count = sum(not row[0] for row in result.all())
    await session.commit()
    return absent_count


async def record_october_server_membership(
    session: AsyncSession, player_id: int, is_present: bool,
) -> None:
    await session.execute(
        text("""
            INSERT INTO october_compendium_server_membership
                (player_id, is_present, stars_reset_at, checked_at)
            SELECT discord_id, :is_present,
                CASE WHEN :is_present THEN NULL ELSE NOW() END, NOW()
            FROM players WHERE discord_id = :player_id
            ON CONFLICT (player_id) DO UPDATE
            SET is_present = EXCLUDED.is_present,
                stars_reset_at = CASE
                    WHEN EXCLUDED.is_present <> october_compendium_server_membership.is_present
                    THEN NOW()
                    ELSE october_compendium_server_membership.stars_reset_at
                END,
                checked_at = NOW()
        """),
        {"player_id": player_id, "is_present": is_present},
    )
    await session.commit()
