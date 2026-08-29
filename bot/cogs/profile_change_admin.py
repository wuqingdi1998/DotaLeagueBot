import discord
from discord import app_commands
from discord.ext import commands

from services.profile_change_service import ProfileChangeService


class ProfileChangeAdmin(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _restore(
        self,
        interaction: discord.Interaction,
        participant: discord.Member | None,
        *,
        nickname: bool,
        positions: bool,
    ) -> None:
        await interaction.response.defer(ephemeral=True)
        async with self.bot.session_maker() as session:
            updated = await ProfileChangeService(session).restore_changes(
                participant.id if participant else None,
                nickname=nickname,
                positions=positions,
            )
        target = participant.mention if participant else "всех участников"
        await interaction.followup.send(
            f"✅ Запас изменений восстановлен для {target}. "
            f"Обновлено профилей: {updated}.",
            ephemeral=True,
        )

    @app_commands.command(
        name="restore_nickname_change",
        description="[Admin] Вернуть участнику одну смену ника",
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def restore_nickname_change(
        self,
        interaction: discord.Interaction,
        participant: discord.Member,
    ) -> None:
        await self._restore(
            interaction,
            participant,
            nickname=True,
            positions=False,
        )

    @app_commands.command(
        name="restore_position_change",
        description="[Admin] Вернуть участнику одну смену игровых позиций",
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def restore_position_change(
        self,
        interaction: discord.Interaction,
        participant: discord.Member,
    ) -> None:
        await self._restore(
            interaction,
            participant,
            nickname=False,
            positions=True,
        )

    @app_commands.command(
        name="restore_profile_changes",
        description="[Admin] Вернуть участнику смену ника и позиций",
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def restore_profile_changes(
        self,
        interaction: discord.Interaction,
        participant: discord.Member,
    ) -> None:
        await self._restore(
            interaction,
            participant,
            nickname=True,
            positions=True,
        )

    @app_commands.command(
        name="restore_profile_changes_all",
        description="[Admin] Вернуть смену ника и позиций всем участникам",
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def restore_profile_changes_all(
        self,
        interaction: discord.Interaction,
    ) -> None:
        await self._restore(
            interaction,
            None,
            nickname=True,
            positions=True,
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(ProfileChangeAdmin(bot))
