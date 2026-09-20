from __future__ import annotations

import asyncio
import logging

import discord
from discord import app_commands
from discord.ext import commands

from database.core import async_session
from services.season_round_announcement import (
    build_announcement_message,
    deliver_announcement,
    fetch_announcement_recipients,
    find_upcoming_season_round,
)


LOGGER = logging.getLogger(__name__)


class AnnouncementConfirmationView(discord.ui.View):
    def __init__(
        self,
        cog: SeasonRoundAnnouncementCog,
        owner_id: int,
        round_id: int,
    ) -> None:
        super().__init__(timeout=300)
        self.cog = cog
        self.owner_id = owner_id
        self.round_id = round_id
        self.has_started = False

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id == self.owner_id:
            return True
        await interaction.response.send_message(
            "Эти кнопки доступны только организатору, который вызвал команду.",
            ephemeral=True,
        )
        return False

    def _disable_buttons(self) -> None:
        for child in self.children:
            if isinstance(child, discord.ui.Button):
                child.disabled = True

    @discord.ui.button(label="Отправить", style=discord.ButtonStyle.green, emoji="📨")
    async def confirm(
        self,
        interaction: discord.Interaction,
        button: discord.ui.Button,
    ) -> None:
        del button
        if self.has_started:
            await interaction.response.send_message(
                "Рассылка уже запущена.",
                ephemeral=True,
            )
            return
        self.has_started = True
        await interaction.response.defer()
        self._disable_buttons()
        await interaction.edit_original_response(
            content="Начинаю рассылку…",
            embed=None,
            view=self,
        )
        try:
            async with self.cog.delivery_lock:
                async with async_session() as session:
                    season_round = await find_upcoming_season_round(session)
                if season_round is None or season_round.id != self.round_id:
                    await interaction.edit_original_response(
                        content=(
                            "Рассылка не начата: ближайший тур изменился. "
                            "Запустите команду ещё раз и проверьте новый предпросмотр."
                        ),
                        view=self,
                    )
                    self.stop()
                    return
                guild = interaction.guild
                if guild is None:
                    await interaction.edit_original_response(
                        content="Рассылка доступна только внутри сервера.",
                        view=self,
                    )
                    self.stop()
                    return
                recipients = await fetch_announcement_recipients(guild)
                report = await deliver_announcement(
                    recipients,
                    build_announcement_message(season_round),
                )
            await interaction.edit_original_response(
                content=(
                    "Рассылка завершена.\n"
                    f"Доставлено: **{report.sent} из {report.total}**.\n"
                    f"Не доставлено: **{report.failed}**."
                ),
                view=self,
            )
        except Exception:
            LOGGER.exception("Season round announcement delivery failed")
            await interaction.edit_original_response(
                content=(
                    "Во время рассылки произошла ошибка. Массовая отправка остановлена; "
                    "подробности записаны в журнал бота."
                ),
                view=self,
            )
        finally:
            self.stop()

    @discord.ui.button(label="Отмена", style=discord.ButtonStyle.secondary)
    async def cancel(
        self,
        interaction: discord.Interaction,
        button: discord.ui.Button,
    ) -> None:
        del button
        self._disable_buttons()
        self.stop()
        await interaction.response.edit_message(
            content="Рассылка отменена. Сообщения не отправлялись.",
            embed=None,
            view=self,
        )


class SeasonRoundAnnouncementCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.delivery_lock = asyncio.Lock()

    @app_commands.command(
        name="season_announce",
        description="[Admin] Анонсировать ближайший тур сезонной лиги в личные сообщения",
    )
    @app_commands.guild_only()
    @app_commands.default_permissions(administrator=True)
    @app_commands.checks.has_permissions(administrator=True)
    async def season_announce(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)
        if interaction.guild is None:
            await interaction.edit_original_response(
                content="Команда доступна только внутри сервера."
            )
            return
        async with async_session() as session:
            season_round = await find_upcoming_season_round(session)
        if season_round is None:
            await interaction.edit_original_response(
                content=(
                    "Активная сезонная лига с предстоящим обычным туром не найдена. "
                    "Финальный тур команда не анонсирует."
                )
            )
            return
        recipients = await fetch_announcement_recipients(interaction.guild)
        message = build_announcement_message(season_round)
        embed = discord.Embed(
            title="Предпросмотр рассылки",
            description=message,
            color=discord.Color.from_rgb(0, 195, 255),
        )
        embed.add_field(
            name="Получатели",
            value=f"{len(recipients)} участников с одной из двух заданных ролей",
            inline=False,
        )
        view = AnnouncementConfirmationView(
            cog=self,
            owner_id=interaction.user.id,
            round_id=season_round.id,
        )
        await interaction.edit_original_response(embed=embed, view=view)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(SeasonRoundAnnouncementCog(bot))
