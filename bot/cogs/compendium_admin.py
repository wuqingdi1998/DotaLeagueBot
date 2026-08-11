from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from services.compendium_star_service import (
    CompendiumStarAdjustmentError,
    CompendiumStarService,
)
from services.compendium_announcement import broadcast_compendium_announcement
from services.compendium_unclaimed_stars import (
    CompendiumUnclaimedStarsError,
    format_unclaimed_challenges_report,
    request_unclaimed_challenges_report,
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

    @app_commands.command(
        name="compendium",
        description="[Admin] Разослать участникам анонс Гонки за звёздами",
    )
    @app_commands.guild_only()
    @app_commands.checks.has_permissions(administrator=True)
    async def announce_compendium(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)
        if interaction.guild is None:
            await interaction.followup.send(
                "❌ Команду можно использовать только на сервере.",
                ephemeral=True,
            )
            return

        try:
            report = await broadcast_compendium_announcement(interaction.guild)
        except discord.HTTPException:
            await interaction.followup.send(
                "❌ Не удалось получить список участников сервера.",
                ephemeral=True,
            )
            return

        await interaction.followup.send(
            f"✅ Рассылка завершена. Отправлено: **{report.sent_count}**. "
            f"Не доставлено: **{report.failed_count}**. "
            f"Боты пропущены: **{report.skipped_bot_count}**.",
            ephemeral=True,
        )

    @app_commands.command(
        name="completestars",
        description="[Admin] Найти выполнивших задание без полученной награды",
    )
    @app_commands.guild_only()
    @app_commands.checks.has_permissions(administrator=True)
    async def complete_stars(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=False)
        try:
            report = await request_unclaimed_challenges_report()
        except CompendiumUnclaimedStarsError as error:
            await interaction.followup.send(f"❌ {error}", ephemeral=False)
            return

        for message in format_unclaimed_challenges_report(report):
            await interaction.followup.send(
                message,
                ephemeral=False,
                allowed_mentions=discord.AllowedMentions.none(),
            )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(CompendiumAdmin(bot))
