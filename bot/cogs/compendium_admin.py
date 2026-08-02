from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from services.compendium_star_service import (
    CompendiumStarAdjustmentError,
    CompendiumStarService,
)


async def compendium_nickname_autocomplete(
    _interaction: discord.Interaction,
    current: str,
) -> list[app_commands.Choice[str]]:
    service = CompendiumStarService()
    nicknames = await service.nickname_suggestions(current)
    return [app_commands.Choice(name=nickname, value=nickname) for nickname in nicknames]


class CompendiumAdmin(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.star_service = CompendiumStarService()

    async def change_stars(
        self,
        interaction: discord.Interaction,
        nickname: str,
        amount: int,
    ) -> None:
        await interaction.response.defer(ephemeral=True)
        try:
            result = await self.star_service.adjust_stars(
                nickname=nickname,
                amount=amount,
                administrator_id=interaction.user.id,
                administrator_name=str(interaction.user),
            )
        except CompendiumStarAdjustmentError as error:
            await interaction.followup.send(f"❌ {error}", ephemeral=True)
            return
        action = "выдано" if result.amount > 0 else "снято"
        await interaction.followup.send(
            f"✅ Игроку **{result.nickname}** {action} "
            f"**{abs(result.amount)}** звёзд. Теперь у него **{result.total_stars}**.",
            ephemeral=True,
        )

    @app_commands.command(
        name="add_stars",
        description="[Admin] Выдать игроку звёзды компендиума",
    )
    @app_commands.describe(nickname="Никнейм игрока", amount="Количество звёзд")
    @app_commands.autocomplete(nickname=compendium_nickname_autocomplete)
    @app_commands.checks.has_permissions(administrator=True)
    async def add_stars(
        self,
        interaction: discord.Interaction,
        nickname: str,
        amount: app_commands.Range[int, 1, 10000],
    ) -> None:
        await self.change_stars(interaction, nickname, int(amount))

    @app_commands.command(
        name="delete_stars",
        description="[Admin] Снять у игрока звёзды компендиума",
    )
    @app_commands.describe(nickname="Никнейм игрока", amount="Количество звёзд")
    @app_commands.autocomplete(nickname=compendium_nickname_autocomplete)
    @app_commands.checks.has_permissions(administrator=True)
    async def delete_stars(
        self,
        interaction: discord.Interaction,
        nickname: str,
        amount: app_commands.Range[int, 1, 10000],
    ) -> None:
        await self.change_stars(interaction, nickname, -int(amount))


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(CompendiumAdmin(bot))
