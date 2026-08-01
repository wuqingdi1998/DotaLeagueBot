from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import text

from database.core import async_session


@dataclass(frozen=True)
class TitanRecipient:
    discord_id: int
    nickname: str


@dataclass(frozen=True)
class CheckupDeadline:
    request_id: int
    player_id: int
    nickname: str
    expires_at: datetime


class TitanCheckupService:
    async def recipients(self) -> list[TitanRecipient]:
        async with async_session() as session:
            rows = await session.execute(
                text(
                    """
                    SELECT discord_id, ingame_name AS nickname
                    FROM (
                        SELECT
                            discord_id,
                            ingame_name,
                            tier_status,
                            COALESCE(
                                NULLIF(internal_rating, 0),
                                CASE
                                    WHEN rank_tier >= 10 THEN rank_tier / 10
                                    WHEN rank_tier > 0 THEN rank_tier
                                    ELSE 0
                                END
                            )::int AS effective_tier
                        FROM players
                        WHERE is_archived = FALSE
                          AND discord_id > 0
                    ) player
                    WHERE effective_tier >= 8
                      AND tier_status <> 'inactive'
                    ORDER BY LOWER(ingame_name), discord_id
                    """
                )
            )
            return [
                TitanRecipient(int(row.discord_id), str(row.nickname))
                for row in rows
            ]

    async def create_request(self, player_id: int, requested_by: int) -> int:
        async with async_session.begin() as session:
            await session.execute(
                text(
                    """
                    UPDATE titan_checkup_requests
                    SET status = 'replaced', updated_at = NOW()
                    WHERE player_id = :player_id
                      AND status IN ('created', 'sent', 'ready')
                    """
                ),
                {"player_id": player_id},
            )
            created = await session.execute(
                text(
                    """
                    INSERT INTO titan_checkup_requests(player_id, requested_by)
                    VALUES (:player_id, :requested_by)
                    RETURNING id
                    """
                ),
                {"player_id": player_id, "requested_by": requested_by},
            )
            return int(created.scalar_one())

    async def mark_delivered(
        self,
        request_id: int,
        message_id: int,
        response_timeout_seconds: int,
    ) -> CheckupDeadline | None:
        async with async_session.begin() as session:
            result = await session.execute(
                text(
                    """
                    UPDATE titan_checkup_requests request
                    SET status = 'sent',
                        dm_message_id = :message_id,
                        expires_at = NOW() + make_interval(
                            secs => :response_timeout_seconds
                        ),
                        updated_at = NOW()
                    FROM players player
                    WHERE request.id = :request_id
                      AND request.status = 'created'
                      AND player.discord_id = request.player_id
                    RETURNING request.id, request.player_id,
                              player.ingame_name AS nickname, request.expires_at
                    """
                ),
                {
                    "request_id": request_id,
                    "message_id": message_id,
                    "response_timeout_seconds": response_timeout_seconds,
                },
            )
            return self._deadline(result.first())

    async def mark_delivery_failed(self, request_id: int) -> None:
        await self._set_delivery_state(request_id, "delivery_failed", None)

    async def _set_delivery_state(
        self,
        request_id: int,
        status: str,
        message_id: int | None,
    ) -> None:
        async with async_session.begin() as session:
            await session.execute(
                text(
                    """
                    UPDATE titan_checkup_requests
                    SET status = :status,
                        dm_message_id = :message_id,
                        updated_at = NOW()
                    WHERE id = :request_id AND status = 'created'
                    """
                ),
                {
                    "request_id": request_id,
                    "status": status,
                    "message_id": message_id,
                },
            )

    async def mark_ready(
        self,
        player_id: int,
        message_id: int,
        timeout_seconds: int,
    ) -> CheckupDeadline | None:
        async with async_session.begin() as session:
            result = await session.execute(
                text(
                    """
                    UPDATE titan_checkup_requests request
                    SET status = 'ready',
                        ready_at = NOW(),
                        expires_at = NOW() + make_interval(secs => :timeout_seconds),
                        responded_at = NOW(),
                        updated_at = NOW()
                    FROM players player
                    WHERE request.player_id = :player_id
                      AND request.dm_message_id = :message_id
                      AND request.status = 'sent'
                      AND request.expires_at > NOW()
                      AND player.discord_id = request.player_id
                    RETURNING request.id, request.player_id,
                              player.ingame_name AS nickname, request.expires_at
                    """
                ),
                {
                    "player_id": player_id,
                    "message_id": message_id,
                    "timeout_seconds": timeout_seconds,
                },
            )
            return self._deadline(result.first())

    async def requests_awaiting_response(self) -> list[CheckupDeadline]:
        async with async_session() as session:
            result = await session.execute(
                text(
                    """
                    SELECT request.id, request.player_id,
                           player.ingame_name AS nickname, request.expires_at
                    FROM titan_checkup_requests request
                    JOIN players player ON player.discord_id = request.player_id
                    WHERE request.status = 'sent'
                      AND request.expires_at IS NOT NULL
                    ORDER BY request.expires_at, request.id
                    """
                )
            )
            requests: list[CheckupDeadline] = []
            for row in result:
                request = self._deadline(row)
                if request is not None:
                    requests.append(request)
            return requests

    async def mark_later(self, player_id: int, message_id: int) -> int | None:
        return await self._mark_outcome(player_id, message_id, "later", "outdated")

    async def mark_inactive(self, player_id: int, message_id: int) -> int | None:
        return await self._mark_outcome(player_id, message_id, "inactive", "inactive")

    async def _mark_outcome(
        self,
        player_id: int,
        message_id: int,
        request_status: str,
        tier_status: str,
    ) -> int | None:
        async with async_session.begin() as session:
            changed = await session.execute(
                text(
                    """
                    UPDATE titan_checkup_requests
                    SET status = :request_status,
                        responded_at = NOW(),
                        updated_at = NOW()
                    WHERE player_id = :player_id
                      AND dm_message_id = :message_id
                      AND status IN ('sent', 'ready')
                    RETURNING id
                    """
                ),
                {
                    "player_id": player_id,
                    "message_id": message_id,
                    "request_status": request_status,
                },
            )
            request_id = changed.scalar_one_or_none()
            if request_id is None:
                return None
            await session.execute(
                text(
                    """
                    UPDATE players
                    SET tier_status = :tier_status, last_updated = NOW()
                    WHERE discord_id = :player_id AND is_archived = FALSE
                    """
                ),
                {"player_id": player_id, "tier_status": tier_status},
            )
            return int(request_id)

    async def requests_awaiting_images(self) -> list[CheckupDeadline]:
        async with async_session() as session:
            result = await session.execute(
                text(
                    """
                    SELECT request.id, request.player_id,
                           player.ingame_name AS nickname, request.expires_at
                    FROM titan_checkup_requests request
                    JOIN players player ON player.discord_id = request.player_id
                    WHERE request.status = 'ready'
                    ORDER BY request.expires_at, request.id
                    """
                )
            )
            requests: list[CheckupDeadline] = []
            for row in result:
                request = self._deadline(row)
                if request is not None:
                    requests.append(request)
            return requests

    async def submission_request(self, player_id: int) -> CheckupDeadline | None:
        async with async_session() as session:
            result = await session.execute(
                text(
                    """
                    SELECT request.id, request.player_id,
                           player.ingame_name AS nickname, request.expires_at
                    FROM titan_checkup_requests request
                    JOIN players player ON player.discord_id = request.player_id
                    WHERE request.player_id = :player_id
                      AND request.status IN ('ready', 'expired')
                      AND request.submitted_at IS NULL
                    ORDER BY request.id DESC
                    LIMIT 1
                    """
                ),
                {"player_id": player_id},
            )
            return self._deadline(result.first())

    async def complete_submission(
        self,
        request_id: int,
        submitted_at: datetime,
        forwarded_message_id: int,
    ) -> bool:
        async with async_session.begin() as session:
            changed = await session.execute(
                text(
                    """
                    UPDATE titan_checkup_requests request
                    SET status = 'submitted',
                        submitted_at = :submitted_at,
                        forwarded_message_id = :forwarded_message_id,
                        updated_at = NOW()
                    WHERE request.id = :request_id
                      AND request.status IN ('ready', 'expired')
                      AND :submitted_at <= request.expires_at
                    RETURNING request.player_id
                    """
                ),
                {
                    "request_id": request_id,
                    "submitted_at": submitted_at,
                    "forwarded_message_id": forwarded_message_id,
                },
            )
            player_id = changed.scalar_one_or_none()
            if player_id is None:
                return False
            await session.execute(
                text(
                    """
                    UPDATE players
                    SET tier_status = 'current', last_updated = NOW()
                    WHERE discord_id = :player_id AND is_archived = FALSE
                    """
                ),
                {"player_id": player_id},
            )
            return True

    async def expire_request(self, request_id: int) -> CheckupDeadline | None:
        async with async_session.begin() as session:
            result = await session.execute(
                text(
                    """
                    UPDATE titan_checkup_requests request
                    SET status = 'expired', updated_at = NOW()
                    FROM players player
                    WHERE request.id = :request_id
                      AND request.status = 'ready'
                      AND request.expires_at <= NOW()
                      AND player.discord_id = request.player_id
                    RETURNING request.id, request.player_id,
                              player.ingame_name AS nickname, request.expires_at
                    """
                ),
                {"request_id": request_id},
            )
            expired = self._deadline(result.first())
            if expired is None:
                return None
            await session.execute(
                text(
                    """
                    UPDATE players
                    SET tier_status = 'outdated', last_updated = NOW()
                    WHERE discord_id = :player_id
                      AND is_archived = FALSE
                      AND tier_status <> 'inactive'
                    """
                ),
                {"player_id": expired.player_id},
            )
            return expired

    async def expire_ignored_request(
        self,
        request_id: int,
    ) -> CheckupDeadline | None:
        async with async_session.begin() as session:
            result = await session.execute(
                text(
                    """
                    UPDATE titan_checkup_requests request
                    SET status = 'later', updated_at = NOW()
                    FROM players player
                    WHERE request.id = :request_id
                      AND request.status = 'sent'
                      AND request.expires_at <= NOW()
                      AND player.discord_id = request.player_id
                    RETURNING request.id, request.player_id,
                              player.ingame_name AS nickname, request.expires_at
                    """
                ),
                {"request_id": request_id},
            )
            ignored = self._deadline(result.first())
            if ignored is None:
                return None
            await session.execute(
                text(
                    """
                    UPDATE players
                    SET tier_status = 'outdated', last_updated = NOW()
                    WHERE discord_id = :player_id
                      AND is_archived = FALSE
                      AND tier_status <> 'inactive'
                    """
                ),
                {"player_id": ignored.player_id},
            )
            return ignored

    async def inactive_player_choices(self, search: str) -> list[TitanRecipient]:
        async with async_session() as session:
            result = await session.execute(
                text(
                    """
                    SELECT discord_id, ingame_name AS nickname
                    FROM players
                    WHERE is_archived = FALSE
                      AND tier_status = 'inactive'
                      AND ingame_name ILIKE :search
                    ORDER BY LOWER(ingame_name), discord_id
                    LIMIT 25
                    """
                ),
                {"search": f"%{search.strip()}%"},
            )
            return [
                TitanRecipient(int(row.discord_id), str(row.nickname))
                for row in result
            ]

    async def disable_inactive(self, player_id: int) -> str | None:
        async with async_session.begin() as session:
            result = await session.execute(
                text(
                    """
                    UPDATE players
                    SET tier_status = 'outdated', last_updated = NOW()
                    WHERE discord_id = :player_id
                      AND is_archived = FALSE
                      AND tier_status = 'inactive'
                    RETURNING ingame_name
                    """
                ),
                {"player_id": player_id},
            )
            nickname = result.scalar_one_or_none()
            return str(nickname) if nickname is not None else None

    @staticmethod
    def _deadline(row) -> CheckupDeadline | None:
        if row is None:
            return None
        return CheckupDeadline(
            request_id=int(row.id),
            player_id=int(row.player_id),
            nickname=str(row.nickname),
            expires_at=row.expires_at,
        )
