from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import text

from database.core import async_session


class CompendiumStarAdjustmentError(ValueError):
    pass


@dataclass(frozen=True)
class CompendiumStarAdjustmentResult:
    nickname: str
    amount: int
    total_stars: int


class CompendiumStarService:
    async def nickname_suggestions(self, current: str) -> list[str]:
        async with async_session() as session:
            rows = await session.execute(
                text(
                    """
                    SELECT ingame_name
                    FROM players
                    WHERE is_archived = FALSE
                      AND ingame_name ILIKE :pattern
                    ORDER BY
                      CASE WHEN LOWER(ingame_name) = LOWER(:current) THEN 0 ELSE 1 END,
                      LOWER(ingame_name), discord_id
                    LIMIT 25
                    """
                ),
                {"pattern": f"%{current}%", "current": current},
            )
            return [str(row.ingame_name) for row in rows]

    async def adjust_stars(
        self,
        nickname: str,
        amount: int,
        administrator_id: int,
        administrator_name: str,
    ) -> CompendiumStarAdjustmentResult:
        if amount == 0 or abs(amount) > 10000:
            raise CompendiumStarAdjustmentError(
                "Количество должно быть от 1 до 10 000 звёзд."
            )
        normalized_nickname = nickname.strip()
        if not normalized_nickname:
            raise CompendiumStarAdjustmentError("Укажите никнейм игрока.")

        async with async_session.begin() as session:
            players = await session.execute(
                text(
                    """
                    SELECT discord_id, ingame_name
                    FROM players
                    WHERE is_archived = FALSE
                      AND LOWER(ingame_name) = LOWER(:nickname)
                    ORDER BY discord_id
                    LIMIT 2
                    """
                ),
                {"nickname": normalized_nickname},
            )
            matches = list(players)
            if not matches:
                raise CompendiumStarAdjustmentError(
                    f"Игрок с никнеймом «{normalized_nickname}» не найден."
                )
            if len(matches) > 1:
                raise CompendiumStarAdjustmentError(
                    "Найдено несколько игроков с таким никнеймом. "
                    "Сначала сделайте никнеймы уникальными."
                )
            player_id = int(matches[0].discord_id)
            player_nickname = str(matches[0].ingame_name)
            await session.execute(
                text("SELECT pg_advisory_xact_lock(hashtext(:lock_key))"),
                {"lock_key": f"compendium-admin-stars:{player_id}"},
            )
            total_result = await session.execute(
                text(
                    """
                    SELECT total_stars
                    FROM compendium_player_star_totals
                    WHERE player_id = :player_id
                    """
                ),
                {"player_id": player_id},
            )
            current_total = int(total_result.scalar_one_or_none() or 0)
            if amount < 0 and current_total < abs(amount):
                raise CompendiumStarAdjustmentError(
                    f"Недостаточно звёзд: у {player_nickname} сейчас {current_total}."
                )
            await session.execute(
                text(
                    """
                    INSERT INTO compendium_admin_star_adjustments (
                        player_id,
                        amount,
                        administered_by,
                        administrator_name
                    ) VALUES (
                        :player_id,
                        :amount,
                        :administrator_id,
                        :administrator_name
                    )
                    """
                ),
                {
                    "player_id": player_id,
                    "amount": amount,
                    "administrator_id": administrator_id,
                    "administrator_name": administrator_name[:120],
                },
            )
            return CompendiumStarAdjustmentResult(
                nickname=player_nickname,
                amount=amount,
                total_stars=current_total + amount,
            )
