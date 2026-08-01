from __future__ import annotations

import discord
from discord.ext import commands


async def _dispatch_action(
    interaction: discord.Interaction,
    action: str,
) -> None:
    if not isinstance(interaction.client, commands.Bot):
        cog = None
    else:
        cog = interaction.client.get_cog("TitanCheckup")
    handler = getattr(cog, "handle_checkup_action", None)
    if handler is None:
        await interaction.response.send_message(
            "Функция актуализации временно недоступна.",
            ephemeral=True,
        )
        return
    await handler(interaction, action)


class TitanCheckupView(discord.ui.View):
    def __init__(self) -> None:
        super().__init__(timeout=None)

    @discord.ui.button(
        label="Готов",
        style=discord.ButtonStyle.success,
        custom_id="titan_checkup:ready",
    )
    async def ready(
        self,
        interaction: discord.Interaction,
        _button: discord.ui.Button,
    ) -> None:
        await _dispatch_action(interaction, "ready")

    @discord.ui.button(
        label="Позже",
        style=discord.ButtonStyle.secondary,
        custom_id="titan_checkup:later",
    )
    async def later(
        self,
        interaction: discord.Interaction,
        _button: discord.ui.Button,
    ) -> None:
        await _dispatch_action(interaction, "later")

    @discord.ui.button(
        label="Инактив",
        style=discord.ButtonStyle.danger,
        custom_id="titan_checkup:inactive",
    )
    async def inactive(
        self,
        interaction: discord.Interaction,
        _button: discord.ui.Button,
    ) -> None:
        await _dispatch_action(interaction, "inactive")


def resolved_titan_checkup_view(selected_action: str) -> discord.ui.View:
    view = discord.ui.View(timeout=None)
    buttons = (
        ("Готов", "ready", discord.ButtonStyle.success),
        ("Позже", "later", discord.ButtonStyle.secondary),
        ("Инактив", "inactive", discord.ButtonStyle.danger),
    )
    for label, action, style in buttons:
        view.add_item(
            discord.ui.Button(
                label=label,
                style=style,
                custom_id=f"titan_checkup:resolved:{action}",
                disabled=True,
                row=0,
            )
        )
    return view
