from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

SessionFactory = Callable[[], AsyncSession]


@dataclass(frozen=True)
class SubscriptionRoleGrant:
    guild_id: int
    member_id: int
    role_id: int
    expires_at: datetime


def subscription_expiration(days: int, *, now: datetime | None = None) -> datetime:
    current_time = now or datetime.now(timezone.utc)
    return current_time + timedelta(days=days)


class SubscriptionRoleGrantService:
    """Stores temporary Discord roles so expirations survive bot restarts."""

    def __init__(self, session_factory: SessionFactory | None = None) -> None:
        if session_factory is None:
            from database.core import async_session

            session_factory = async_session
        self.session_factory = session_factory

    async def schedule_grant(
        self,
        *,
        guild_id: int,
        member_id: int,
        role_id: int,
        granted_by: int,
        expires_at: datetime,
    ) -> SubscriptionRoleGrant:
        async with self.session_factory() as session:
            await session.execute(
                text(
                    """
                    INSERT INTO temporary_subscription_roles (
                        guild_id,
                        member_id,
                        role_id,
                        granted_by,
                        expires_at
                    )
                    VALUES (
                        :guild_id,
                        :member_id,
                        :role_id,
                        :granted_by,
                        :expires_at
                    )
                    ON CONFLICT (guild_id, member_id, role_id) DO UPDATE
                    SET granted_by = EXCLUDED.granted_by,
                        expires_at = EXCLUDED.expires_at,
                        updated_at = NOW()
                    """
                ),
                {
                    "guild_id": guild_id,
                    "member_id": member_id,
                    "role_id": role_id,
                    "granted_by": granted_by,
                    "expires_at": expires_at,
                },
            )
            await session.commit()
        return SubscriptionRoleGrant(
            guild_id=guild_id,
            member_id=member_id,
            role_id=role_id,
            expires_at=expires_at,
        )

    async def due_grants(self) -> tuple[SubscriptionRoleGrant, ...]:
        async with self.session_factory() as session:
            result = await session.execute(
                text(
                    """
                    SELECT guild_id, member_id, role_id, expires_at
                    FROM temporary_subscription_roles
                    WHERE expires_at <= NOW()
                    ORDER BY expires_at, guild_id, member_id, role_id
                    LIMIT 100
                    """
                )
            )
            return tuple(
                SubscriptionRoleGrant(
                    guild_id=int(row["guild_id"]),
                    member_id=int(row["member_id"]),
                    role_id=int(row["role_id"]),
                    expires_at=row["expires_at"],
                )
                for row in result.mappings().all()
            )

    async def complete_grant(self, grant: SubscriptionRoleGrant) -> bool:
        async with self.session_factory() as session:
            result = await session.execute(
                text(
                    """
                    DELETE FROM temporary_subscription_roles
                    WHERE guild_id = :guild_id
                      AND member_id = :member_id
                      AND role_id = :role_id
                      AND expires_at = :expires_at
                    RETURNING guild_id
                    """
                ),
                {
                    "guild_id": grant.guild_id,
                    "member_id": grant.member_id,
                    "role_id": grant.role_id,
                    "expires_at": grant.expires_at,
                },
            )
            await session.commit()
            return result.first() is not None

    async def next_due_at(self) -> datetime | None:
        async with self.session_factory() as session:
            result = await session.execute(
                text(
                    """
                    SELECT MIN(expires_at)
                    FROM temporary_subscription_roles
                    """
                )
            )
            return result.scalar_one_or_none()
