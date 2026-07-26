import os
import discord
from discord.ext import commands, tasks
from dotenv import load_dotenv
from sqlalchemy import text

from database.core import async_session
from utils.subscription_roles import (
    canonical_subscription_role_name,
    subscription_role_rows,
)

load_dotenv()


def _parse_role_ids(raw: str | None) -> set[int]:
    if not raw:
        return set()
    out = set()
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            out.add(int(part))
        except ValueError:
            pass
    return out


GRANT_ROLE_ID = int(os.getenv("BOOSTY_GRANT_ROLE_ID") or 0) or None
SUBSCRIPTION_ROLE_IDS: set[int] = _parse_role_ids(os.getenv("BOOSTY_SUBSCRIPTION_ROLE_IDS"))
GUILD_ID_ENV = os.getenv("GUILD_ID")


class Boosty(commands.Cog):
    """Synchronizes subscription runes and the optional Boosty grant role."""

    def __init__(self, bot):
        self.bot = bot
        self.sync_task.start()

    def cog_unload(self):
        self.sync_task.cancel()

    def _grant_sync_enabled(self) -> bool:
        return bool(GRANT_ROLE_ID and SUBSCRIPTION_ROLE_IDS)

    async def _store_member_subscription_roles(
        self,
        member: discord.Member,
    ) -> None:
        async with async_session() as session:
            registered = await session.execute(
                text("SELECT 1 FROM players WHERE discord_id = :player_id"),
                {"player_id": member.id},
            )
            if registered.scalar_one_or_none() is None:
                return

            await session.execute(
                text(
                    "DELETE FROM player_discord_roles "
                    "WHERE player_id = :player_id"
                ),
                {"player_id": member.id},
            )
            rows = subscription_role_rows(
                member.id,
                member.roles,
                SUBSCRIPTION_ROLE_IDS,
            )
            if rows:
                await session.execute(
                    text(
                        """
                        INSERT INTO player_discord_roles (
                            player_id, role_id, role_name, role_color, synced_at
                        )
                        VALUES (
                            :player_id, :role_id, :role_name, :role_color, NOW()
                        )
                        ON CONFLICT (player_id, role_id) DO UPDATE
                        SET role_name = EXCLUDED.role_name,
                            role_color = EXCLUDED.role_color,
                            synced_at = NOW()
                        """
                    ),
                    rows,
                )
            await session.commit()

    async def _store_guild_subscription_roles(
        self,
        guild: discord.Guild,
    ) -> None:
        async with async_session() as session:
            registered_result = await session.execute(
                text("SELECT discord_id FROM players")
            )
            registered_ids = {row[0] for row in registered_result.all()}
            members = [
                member
                for member in guild.members
                if not member.bot and member.id in registered_ids
            ]
            await session.execute(
                text(
                    "DELETE FROM player_discord_roles "
                    "WHERE player_id IN (SELECT discord_id FROM players)"
                )
            )
            rows = [
                row
                for member in members
                for row in subscription_role_rows(
                    member.id,
                    member.roles,
                    SUBSCRIPTION_ROLE_IDS,
                )
            ]
            if rows:
                await session.execute(
                    text(
                        """
                        INSERT INTO player_discord_roles (
                            player_id, role_id, role_name, role_color, synced_at
                        )
                        VALUES (
                            :player_id, :role_id, :role_name, :role_color, NOW()
                        )
                        ON CONFLICT (player_id, role_id) DO UPDATE
                        SET role_name = EXCLUDED.role_name,
                            role_color = EXCLUDED.role_color,
                            synced_at = NOW()
                        """
                    ),
                    rows,
                )
            await session.commit()

    async def _sync_member(self, member: discord.Member, grant_role: discord.Role) -> str | None:
        """Returns 'added', 'removed', or None."""
        member_role_ids = {r.id for r in member.roles}
        has_subscription = bool(member_role_ids & SUBSCRIPTION_ROLE_IDS)
        has_grant = GRANT_ROLE_ID in member_role_ids

        if has_subscription and not has_grant:
            try:
                await member.add_roles(grant_role, reason="Boosty subscription detected")
                return "added"
            except discord.Forbidden:
                print(f"[BOOSTY] Forbidden adding role to {member}")
            except Exception as e:
                print(f"[BOOSTY] Error adding role to {member}: {e}")
        elif not has_subscription and has_grant:
            try:
                await member.remove_roles(grant_role, reason="Boosty subscription expired")
                return "removed"
            except discord.Forbidden:
                print(f"[BOOSTY] Forbidden removing role from {member}")
            except Exception as e:
                print(f"[BOOSTY] Error removing role from {member}: {e}")
        return None

    @tasks.loop(minutes=5)
    async def sync_task(self):
        try:
            guilds = [self.bot.get_guild(int(GUILD_ID_ENV))] if GUILD_ID_ENV else self.bot.guilds
            for guild in guilds:
                if not guild:
                    continue
                added = removed = 0
                grant_role = (
                    guild.get_role(GRANT_ROLE_ID)
                    if self._grant_sync_enabled() and GRANT_ROLE_ID
                    else None
                )
                if grant_role:
                    for member in guild.members:
                        if member.bot:
                            continue
                        result = await self._sync_member(member, grant_role)
                        if result == "added":
                            added += 1
                        elif result == "removed":
                            removed += 1
                await self._store_guild_subscription_roles(guild)
                if added or removed:
                    print(f"[BOOSTY] Guild {guild.id}: +{added} / -{removed} grant-role changes")
        except Exception as e:
            print(f"[BOOSTY] Sync task error: {e}")

    @sync_task.before_loop
    async def before_sync_task(self):
        await self.bot.wait_until_ready()

    @commands.Cog.listener()
    async def on_member_update(self, before: discord.Member, after: discord.Member):
        if after.bot:
            return

        before_ids = {r.id for r in before.roles}
        after_ids = {r.id for r in after.roles}
        if before_ids == after_ids:
            return

        before_subscription_ids = {
            role.id
            for role in before.roles
            if canonical_subscription_role_name(
                role,
                SUBSCRIPTION_ROLE_IDS,
            )
            is not None
        }
        after_subscription_ids = {
            role.id
            for role in after.roles
            if canonical_subscription_role_name(
                role,
                SUBSCRIPTION_ROLE_IDS,
            )
            is not None
        }
        grant_changed = bool(
            GRANT_ROLE_ID and GRANT_ROLE_ID in (before_ids ^ after_ids)
        )
        if before_subscription_ids == after_subscription_ids and not grant_changed:
            return

        grant_role = (
            after.guild.get_role(GRANT_ROLE_ID)
            if self._grant_sync_enabled() and GRANT_ROLE_ID
            else None
        )
        if grant_role:
            await self._sync_member(after, grant_role)
        await self._store_member_subscription_roles(after)


async def setup(bot):
    await bot.add_cog(Boosty(bot))
