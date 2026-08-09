from dataclasses import dataclass

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Player


class PlayerRegistrationError(Exception):
    pass


@dataclass(frozen=True)
class PlayerRegistrationResult:
    player: Player
    was_reactivated: bool


async def _standalone_archive_identity(
    session: AsyncSession,
    player_id: int,
) -> int:
    identity = (
        await session.execute(
            text(
                """
                SELECT identity.id, identity.registered_player_id
                FROM player_identity_members member
                JOIN player_identities identity ON identity.id = member.identity_id
                WHERE member.player_id = :player_id
                FOR UPDATE OF identity
                """
            ),
            {"player_id": player_id},
        )
    ).mappings().first()
    if identity is None:
        raise PlayerRegistrationError(
            "Архивный профиль повреждён. Обратитесь к организатору."
        )
    archive_is_linked = identity["registered_player_id"] is not None
    if archive_is_linked:
        raise PlayerRegistrationError(
            "Архив уже привязан к другому действующему профилю. "
            "Обратитесь к организатору."
        )
    return int(identity["id"])


async def _ensure_dota_id_is_available(
    session: AsyncSession,
    steam_id32: int,
    ignored_player_id: int | None = None,
) -> None:
    query = select(Player.discord_id).where(Player.steam_id32 == steam_id32)
    if ignored_player_id is not None:
        query = query.where(Player.discord_id != ignored_player_id)
    owner = (await session.execute(query.with_for_update())).scalar_one_or_none()
    if owner is not None:
        raise PlayerRegistrationError(
            "Этот Dota ID уже используется другим действующим профилем."
        )


async def register_or_reactivate_player(
    session: AsyncSession,
    *,
    discord_id: int,
    steam_id32: int,
    real_name: str,
    ingame_name: str,
    positions: str,
    rank_tier: int,
    avatar_url: str,
) -> PlayerRegistrationResult:
    existing_player = (
        await session.execute(
            select(Player)
            .where(Player.discord_id == discord_id)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if existing_player is not None and not existing_player.is_archived:
        raise PlayerRegistrationError("Вы уже зарегистрированы.")

    if existing_player is None:
        await _ensure_dota_id_is_available(session, steam_id32)
        player = Player(
            discord_id=discord_id,
            steam_id32=steam_id32,
            real_name=real_name,
            ingame_name=ingame_name,
            positions=positions,
            rank_tier=rank_tier,
            avatar_url=avatar_url,
        )
        session.add(player)
        return PlayerRegistrationResult(player=player, was_reactivated=False)

    identity_id = await _standalone_archive_identity(session, discord_id)
    await _ensure_dota_id_is_available(session, steam_id32, discord_id)
    existing_player.steam_id32 = steam_id32
    existing_player.archived_steam_id32 = None
    existing_player.real_name = real_name
    existing_player.ingame_name = ingame_name
    existing_player.positions = positions
    existing_player.rank_tier = rank_tier
    existing_player.internal_rating = 0
    existing_player.tier_status = "current"
    existing_player.avatar_url = avatar_url
    existing_player.team_id = None
    existing_player.is_archived = False
    existing_player.archived_at = None
    existing_player.archived_by = None
    await session.flush()
    await session.execute(
        text(
            """
            UPDATE player_identities
            SET registered_player_id = :player_id,
                primary_nickname = :nickname,
                updated_at = NOW()
            WHERE id = :identity_id
              AND registered_player_id IS NULL
            """
        ),
        {
            "identity_id": identity_id,
            "player_id": discord_id,
            "nickname": ingame_name,
        },
    )
    await session.execute(
        text(
            """
            UPDATE player_identity_members
            SET nickname_snapshot = :nickname
            WHERE identity_id = :identity_id
              AND player_id = :player_id
            """
        ),
        {
            "identity_id": identity_id,
            "player_id": discord_id,
            "nickname": ingame_name,
        },
    )
    return PlayerRegistrationResult(player=existing_player, was_reactivated=True)
