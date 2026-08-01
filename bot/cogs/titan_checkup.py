from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import discord
from discord import app_commands
from discord.ext import commands

from cogs.ui.titan_checkup import (
    TitanCheckupView,
    resolved_titan_checkup_view,
)
from services.titan_checkup_service import ReadyRequest, TitanCheckupService

FROKENG_DISCORD_ID = 311247030422863882
TITAN_SCREEN_CHANNEL_ID = 1533127829066092715
CHECKUP_TIMEOUT_SECONDS = 300

CHECKUP_MESSAGE = f"""Актуализация ранга в базе игроков Linken's Sphere, отправьте полную страницу с последними матчами и актуальным MMR в клиенте Dota 2.

После нажатия кнопки "Готов" нужно отправить запрашиваемый скриншот в течение 5 минут, не нажимайте кнопку, если не готовы приложить скриншот.

После нажатия кнопки "Позже" ваш тир в базе и на сайте lsesports.ru будет неактуален и его нужно будет актуализировать через <@{FROKENG_DISCORD_ID}> или при следующей актуализации.

После нажатия кнопки "Инактив" ваш тир в базе и на сайте lsesports.ru будет неактуален и его нужно будет актуализировать через <@{FROKENG_DISCORD_ID}>, актуализация больше не будет отправляться вам. Для возвращения в рассылку актуализации нужно написать <@{FROKENG_DISCORD_ID}>."""

READY_MESSAGE = (
    "Отправьте запрашиваемый скриншот сюда в течение 5 минут. "
    "Будет принято только сообщение с изображением."
)
LATER_MESSAGE = (
    "Ваш тир в базе и на сайте lsesports.ru теперь неактуален. "
    f"Для актуализации напишите <@{FROKENG_DISCORD_ID}> или дождитесь "
    "следующей актуализации."
)
INACTIVE_MESSAGE = (
    "Ваш тир в базе и на сайте lsesports.ru теперь неактуален. "
    f"Для актуализации и возвращения в рассылку напишите <@{FROKENG_DISCORD_ID}>."
)
TIMEOUT_MESSAGE = (
    "Вы не успели отправить скриншот в течение 5 минут. Ваш тир в базе и на "
    "сайте lsesports.ru теперь неактуален. Для актуализации напишите "
    f"<@{FROKENG_DISCORD_ID}> или дождитесь следующей актуализации."
)


class TitanCheckup(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.service = TitanCheckupService()
        self.expiry_tasks: dict[int, asyncio.Task[None]] = {}

    async def cog_unload(self) -> None:
        for task in self.expiry_tasks.values():
            task.cancel()
        self.expiry_tasks.clear()

    async def _is_frokeng(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != FROKENG_DISCORD_ID:
            await interaction.response.send_message(
                "Эта команда доступна только frokeng.",
                ephemeral=True,
            )
            return False
        return True

    @app_commands.command(
        name="titan_checkup",
        description="Запросить у титанов актуализацию ранга",
    )
    @app_commands.guild_only()
    @app_commands.default_permissions()
    async def titan_checkup(self, interaction: discord.Interaction) -> None:
        if not await self._is_frokeng(interaction):
            return
        await interaction.response.defer(ephemeral=True, thinking=True)
        recipients = await self.service.recipients()
        delivered = 0
        failures: list[str] = []
        for recipient in recipients:
            request_id = await self.service.create_request(
                recipient.discord_id,
                FROKENG_DISCORD_ID,
            )
            try:
                user = self.bot.get_user(recipient.discord_id)
                if user is None:
                    user = await self.bot.fetch_user(recipient.discord_id)
                sent = await user.send(CHECKUP_MESSAGE, view=TitanCheckupView())
                await self.service.mark_delivered(request_id, sent.id)
                delivered += 1
            except (discord.Forbidden, discord.HTTPException, discord.NotFound):
                await self.service.mark_delivery_failed(request_id)
                failures.append(f"{recipient.nickname} ({recipient.discord_id})")
            await asyncio.sleep(0.15)

        failure_report_sent = await self._send_failure_report(
            interaction.user,
            failures,
        )
        summary = (
            f"Актуализация отправлена: {delivered}. "
            f"Не получили сообщение: {len(failures)}."
        )
        if failures and not failure_report_sent:
            summary += " Не удалось отправить вам список в личные сообщения."
        await interaction.followup.send(summary, ephemeral=True)

    async def _send_failure_report(
        self,
        admin: discord.User | discord.Member,
        failures: list[str],
    ) -> bool:
        if not failures:
            return True
        report = "Не получили запрос актуализации тира:\n" + "\n".join(
            f"• {failure}" for failure in failures
        )
        try:
            await admin.send(report[:2000])
            return True
        except (discord.Forbidden, discord.HTTPException):
            return False

    @app_commands.command(
        name="inactive_off",
        description="Вернуть участника в рассылку актуализации",
    )
    @app_commands.describe(participant="Участник с отметкой «Инактив»")
    @app_commands.guild_only()
    @app_commands.default_permissions()
    async def inactive_off(
        self,
        interaction: discord.Interaction,
        participant: str,
    ) -> None:
        if not await self._is_frokeng(interaction):
            return
        if not participant.isdigit():
            await interaction.response.send_message(
                "Выберите участника из предложенного списка.",
                ephemeral=True,
            )
            return
        nickname = await self.service.disable_inactive(int(participant))
        if nickname is None:
            await interaction.response.send_message(
                "Участник с отметкой «Инактив» не найден.",
                ephemeral=True,
            )
            return
        await interaction.response.send_message(
            f"{nickname} снова будет получать запросы. Тир остаётся неактуальным.",
            ephemeral=True,
        )

    @inactive_off.autocomplete("participant")
    async def inactive_player_choices(
        self,
        interaction: discord.Interaction,
        current: str,
    ) -> list[app_commands.Choice[str]]:
        if interaction.user.id != FROKENG_DISCORD_ID:
            return []
        players = await self.service.inactive_player_choices(current)
        return [
            app_commands.Choice(
                name=f"{player.nickname} · {player.discord_id}",
                value=str(player.discord_id),
            )
            for player in players
        ]

    async def handle_checkup_action(
        self,
        interaction: discord.Interaction,
        action: str,
    ) -> None:
        if interaction.message is None:
            await interaction.response.send_message(
                "Не удалось определить запрос актуализации.",
                ephemeral=True,
            )
            return
        player_id = interaction.user.id
        message_id = interaction.message.id
        if action == "ready":
            request = await self.service.mark_ready(
                player_id,
                message_id,
                CHECKUP_TIMEOUT_SECONDS,
            )
            if request is None:
                await self._already_processed(interaction)
                return
            await interaction.response.edit_message(
                view=resolved_titan_checkup_view(action),
            )
            await interaction.followup.send(READY_MESSAGE)
            self._schedule_expiry(request)
            return
        if action == "later":
            request_id = await self.service.mark_later(player_id, message_id)
            response = LATER_MESSAGE
        elif action == "inactive":
            request_id = await self.service.mark_inactive(player_id, message_id)
            response = INACTIVE_MESSAGE
        else:
            request_id = None
            response = "Неизвестное действие."
        if request_id is None:
            await self._already_processed(interaction)
            return
        self._cancel_expiry(request_id)
        await interaction.response.edit_message(
            view=resolved_titan_checkup_view(action),
        )
        await interaction.followup.send(response)

    @staticmethod
    async def _already_processed(interaction: discord.Interaction) -> None:
        await interaction.response.send_message(
            "Этот запрос уже обработан или больше не действует.",
            ephemeral=True,
        )

    @commands.Cog.listener()
    async def on_ready(self) -> None:
        for request in await self.service.requests_awaiting_images():
            self._schedule_expiry(request)

    def _schedule_expiry(self, request: ReadyRequest) -> None:
        if request.request_id in self.expiry_tasks:
            return
        self.expiry_tasks[request.request_id] = asyncio.create_task(
            self._expire_after_delay(request),
        )

    def _cancel_expiry(self, request_id: int) -> None:
        task = self.expiry_tasks.pop(request_id, None)
        if task is not None:
            task.cancel()

    async def _expire_after_delay(self, request: ReadyRequest) -> None:
        try:
            delay = max(
                0.0,
                (request.expires_at - datetime.now(timezone.utc)).total_seconds(),
            )
            await asyncio.sleep(delay)
            expired = await self.service.expire_request(request.request_id)
            if expired is not None:
                await self._notify_timeout(expired.player_id)
        except asyncio.CancelledError:
            raise
        finally:
            current = asyncio.current_task()
            if self.expiry_tasks.get(request.request_id) is current:
                self.expiry_tasks.pop(request.request_id, None)

    async def _notify_timeout(self, player_id: int) -> None:
        try:
            user = self.bot.get_user(player_id) or await self.bot.fetch_user(player_id)
            await user.send(TIMEOUT_MESSAGE)
        except (discord.Forbidden, discord.HTTPException, discord.NotFound):
            return

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message) -> None:
        if message.author.bot or message.guild is not None:
            return
        request = await self.service.submission_request(message.author.id)
        if request is None:
            return
        image_attachments = [
            attachment
            for attachment in message.attachments
            if attachment.content_type
            and attachment.content_type.startswith("image/")
        ]
        if not image_attachments:
            return
        if message.created_at > request.expires_at:
            expired = await self.service.expire_request(request.request_id)
            if expired is not None:
                await message.channel.send(TIMEOUT_MESSAGE)
            return
        try:
            channel = self.bot.get_channel(TITAN_SCREEN_CHANNEL_ID)
            if channel is None:
                channel = await self.bot.fetch_channel(TITAN_SCREEN_CHANNEL_ID)
            if not isinstance(channel, (discord.TextChannel, discord.Thread)):
                await message.channel.send(
                    "Не удалось найти канал для скриншотов. Попробуйте ещё раз позже."
                )
                return
            files = [
                await attachment.to_file()
                for attachment in image_attachments
            ]
            forwarded = await channel.send(
                content=(
                    f"Актуализация тира от {message.author.mention} "
                    f"— **{request.nickname}**"
                ),
                files=files,
                allowed_mentions=discord.AllowedMentions(users=True),
            )
        except (discord.Forbidden, discord.HTTPException, discord.NotFound):
            await message.channel.send(
                "Не удалось переслать скриншот. Попробуйте ещё раз до истечения 5 минут."
            )
            return
        completed = await self.service.complete_submission(
            request.request_id,
            message.created_at,
            forwarded.id,
        )
        if not completed:
            await message.channel.send(TIMEOUT_MESSAGE)
            return
        self._cancel_expiry(request.request_id)
        await message.channel.send("Скриншот отправлен frokeng.")


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(TitanCheckup(bot))
    bot.add_view(TitanCheckupView())
