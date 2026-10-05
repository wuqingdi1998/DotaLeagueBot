from __future__ import annotations

import datetime
from pathlib import Path

import discord
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from utils.subscription_roles import COMPENDIUM_EXCLUDED_ROLE_NAME


MOSCOW_TIME_ZONE = datetime.timezone(datetime.timedelta(hours=3), name="Europe/Moscow")
COMPENDIUM_START_AT = datetime.datetime(2026, 10, 5, tzinfo=MOSCOW_TIME_ZONE)
ROLE_REMOVAL_AT = datetime.datetime(2026, 10, 27, tzinfo=MOSCOW_TIME_ZONE)
ROLE_SPECS = {
    "morbus": ("Морбус", Path("assets/compendium/morbus-emblem.png")),
    "panacea": ("Панацея", Path("assets/compendium/panacea-emblem.png")),
}
REFERENCE_ROLE_NAME = "Просто посмотреть"


async def assign_october_clan_after_registration(
    session: AsyncSession,
    player_id: int,
    now: datetime.datetime | None = None,
) -> str | None:
    current = now or datetime.datetime.now(MOSCOW_TIME_ZONE)
    if current < COMPENDIUM_START_AT or current >= ROLE_REMOVAL_AT:
        return None
    row = (
        await session.execute(
            text(
                """
                WITH selected_clan AS (
                    SELECT clan_id
                    FROM (VALUES ('morbus'), ('panacea')) AS clans(clan_id)
                    LEFT JOIN october_compendium_clan_members member
                      ON member.clan_id = clans.clan_id
                    GROUP BY clan_id
                    ORDER BY COALESCE(SUM(member.total_points), 0),
                             COUNT(member.player_id), clan_id
                    LIMIT 1
                )
                INSERT INTO october_compendium_clan_members
                    (player_id, clan_id, assignment_source, activity_score)
                SELECT :player_id, selected_clan.clan_id, 'automatic', 0
                FROM selected_clan
                WHERE october_clan_player_is_eligible(:player_id)
                ON CONFLICT (player_id) DO NOTHING
                RETURNING clan_id
                """
            ),
            {"player_id": player_id},
        )
    ).mappings().first()
    await session.commit()
    return str(row["clan_id"]) if row else None


async def load_clan_assignments(
    session: AsyncSession,
    excluded_player_ids: list[int] | None = None,
) -> dict[int, str]:
    await session.execute(
        text("SELECT remove_ineligible_october_clan_players(:excluded_ids)"),
        {"excluded_ids": excluded_player_ids or []},
    )
    await session.commit()
    rows = (
        await session.execute(
            text("SELECT player_id, clan_id FROM october_compendium_clan_members")
        )
    ).mappings().all()
    return {int(row["player_id"]): str(row["clan_id"]) for row in rows}


async def _role_icon(path: Path) -> bytes | None:
    try:
        return path.read_bytes()
    except OSError:
        return None


async def ensure_clan_roles(guild: discord.Guild) -> dict[str, discord.Role]:
    roles: dict[str, discord.Role] = {}
    for clan_id, (name, icon_path) in ROLE_SPECS.items():
        role = discord.utils.get(guild.roles, name=name)
        icon = await _role_icon(icon_path)
        if role is None:
            try:
                if icon is None:
                    role = await guild.create_role(
                        name=name, reason="Роль октябрьского Компендиума",
                    )
                else:
                    role = await guild.create_role(
                        name=name,
                        display_icon=icon,
                        reason="Роль октябрьского Компендиума",
                    )
            except (TypeError, discord.HTTPException):
                role = await guild.create_role(
                    name=name,
                    reason="Роль октябрьского Компендиума",
                )
        elif icon is not None and "ROLE_ICONS" in guild.features:
            await role.edit(display_icon=icon, reason="Значок клана Компендиума")
        roles[clan_id] = role

    reference = discord.utils.get(guild.roles, name=REFERENCE_ROLE_NAME)
    if reference is not None:
        for clan_id in ("panacea", "morbus"):
            await roles[clan_id].edit(
                position=max(1, reference.position - 1),
                reason="Роли кланов под ролью «Просто посмотреть»",
            )
    return roles


async def sync_clan_roles(
    guild: discord.Guild,
    assignments: dict[int, str],
) -> None:
    roles = await ensure_clan_roles(guild)
    managed_roles = set(roles.values())
    for member in guild.members:
        has_excluded_role = any(
            role.name.strip().casefold() == COMPENDIUM_EXCLUDED_ROLE_NAME.casefold()
            for role in member.roles
        )
        target = None if has_excluded_role else roles.get(assignments.get(member.id, ""))
        stale = [role for role in member.roles if role in managed_roles and role != target]
        if stale:
            await member.remove_roles(*stale, reason="Синхронизация клана Компендиума")
            refreshed_member = await guild.fetch_member(member.id)
            if any(role in refreshed_member.roles for role in stale):
                raise RuntimeError(f"Клановая роль не снята у участника {member.id}")
        if target is not None and target not in member.roles:
            await member.add_roles(target, reason="Участник клана Компендиума")
    print(f"[OCTOBER CLANS] Roles synchronized for guild {guild.id}", flush=True)


async def delete_clan_roles(guild: discord.Guild) -> None:
    for name, _icon in ROLE_SPECS.values():
        role = discord.utils.get(guild.roles, name=name)
        if role is not None:
            await role.delete(reason="Компендиум завершён более суток назад")
