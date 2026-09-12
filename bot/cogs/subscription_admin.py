from __future__ import annotations

import asyncio
from datetime import datetime

import discord
from discord import app_commands
from discord.ext import commands
from sqlalchemy.exc import SQLAlchemyError

from services.durable_scheduler import register_scheduled_job
from services.subscription_role_grants import (
    SubscriptionRoleGrant,
    SubscriptionRoleGrantService,
    subscription_expiration,
)
from utils.subscription_roles import SUBSCRIPTION_ROLE_IDS_BY_NAME


SUBSCRIPTION_ROLE_CHOICES = [
    app_commands.Choice(name=role_name, value=str(role_id))
    for role_name, role_id in SUBSCRIPTION_ROLE_IDS_BY_NAME.items()
]
ROLE_EXPIRATION_REASON = "Завершился срок подписки, выданной через /give_subscribe"


class SubscriptionAdmin(commands.Cog):
    """Gives administrators a durable temporary-subscription command."""

    name = "subscription_role_expirations"

    def __init__(
        self,
        bot: commands.Bot,
        grant_service: SubscriptionRoleGrantService | None = None,
    ) -> None:
        self.bot = bot
        self.grant_service = grant_service or SubscriptionRoleGrantService()

    @app_commands.command(
        name="give_subscribe",
        description="[Admin] Выдать участнику руну подписки на указанный срок",
    )
    @app_commands.describe(
        member="Участник сервера",
        role="Руна подписки",
        days="Количество дней (от 1 до 3650)",
    )
    @app_commands.choices(role=SUBSCRIPTION_ROLE_CHOICES)
    @app_commands.guild_only()
    @app_commands.default_permissions(administrator=True)
    @app_commands.checks.has_permissions(administrator=True)
    async def give_subscribe(
        self,
        interaction: discord.Interaction,
        member: discord.Member,
        role: app_commands.Choice[str],
        days: app_commands.Range[int, 1, 3650],
    ) -> None:
        guild = interaction.guild
        if guild is None:
            await interaction.response.send_message(
                "Команда работает только на сервере.",
                ephemeral=True,
            )
            return

        role_id = int(role.value)
        if role_id not in SUBSCRIPTION_ROLE_IDS_BY_NAME.values():
            await interaction.response.send_message(
                "Выбрана неизвестная роль подписки.",
                ephemeral=True,
            )
            return

        discord_role = guild.get_role(role_id)
        if discord_role is None:
            await interaction.response.send_message(
                "Эта роль не найдена на сервере. Проверьте её ID.",
                ephemeral=True,
            )
            return

        await interaction.response.defer(ephemeral=True)
        expires_at = subscription_expiration(days)
        try:
            grant = await self.grant_service.schedule_grant(
                guild_id=guild.id,
                member_id=member.id,
                role_id=role_id,
                granted_by=interaction.user.id,
                expires_at=expires_at,
            )
        except SQLAlchemyError as error:
            print(
                "[SUBSCRIPTION] Could not save temporary role grant for "
                f"member {member.id} in guild {guild.id}: {error}"
            )
            await interaction.followup.send(
                "Не удалось сохранить срок роли. Роль не была выдана.",
                ephemeral=True,
            )
            return

        try:
            if discord_role not in member.roles:
                await member.add_roles(
                    discord_role,
                    reason=(
                        f"Временная подписка на {days} дн. "
                        f"от {interaction.user} через /give_subscribe"
                    ),
                )
        except (discord.Forbidden, discord.HTTPException):
            await self.grant_service.complete_grant(grant)
            await interaction.followup.send(
                "Не удалось выдать роль. Проверьте права бота и положение роли.",
                ephemeral=True,
            )
            return

        expiration_timestamp = int(expires_at.timestamp())
        await interaction.followup.send(
            f"Готово: {member.mention} получил(а) {discord_role.mention} "
            f"до <t:{expiration_timestamp}:F> (<t:{expiration_timestamp}:R>).",
            ephemeral=True,
        )

    async def process_due(self) -> None:
        grants = await self.grant_service.due_grants()
        results = await asyncio.gather(
            *(self.expire_grant(grant) for grant in grants),
            return_exceptions=True,
        )
        cancellations = [
            result for result in results if isinstance(result, asyncio.CancelledError)
        ]
        if cancellations:
            raise cancellations[0]
        failures = [result for result in results if isinstance(result, Exception)]
        if failures:
            raise RuntimeError(
                f"Could not expire {len(failures)} temporary subscription role(s)"
            ) from failures[0]

    async def expire_grant(self, grant: SubscriptionRoleGrant) -> None:
        guild = self.bot.get_guild(grant.guild_id)
        if guild is None:
            await self.grant_service.complete_grant(grant)
            return

        role = guild.get_role(grant.role_id)
        if role is None:
            await self.grant_service.complete_grant(grant)
            return

        member = guild.get_member(grant.member_id)
        if member is None:
            try:
                member = await guild.fetch_member(grant.member_id)
            except discord.NotFound:
                await self.grant_service.complete_grant(grant)
                return

        if role in member.roles:
            await member.remove_roles(role, reason=ROLE_EXPIRATION_REASON)
        is_completed = await self.grant_service.complete_grant(grant)
        if not is_completed:
            await member.add_roles(
                role,
                reason="Срок подписки был продлён во время снятия роли",
            )

    async def next_due_at(self) -> datetime | None:
        return await self.grant_service.next_due_at()


async def setup(bot: commands.Bot) -> None:
    cog = SubscriptionAdmin(bot)
    await bot.add_cog(cog)
    register_scheduled_job(bot, cog)
