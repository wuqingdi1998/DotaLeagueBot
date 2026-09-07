import discord

from services.profile_change_policy import PROFILE_CHANGE_LIMIT


def build_profile_panel_embed() -> discord.Embed:
    return discord.Embed(
        title="⚙️ Управление профилем игрока",
        description=(
            "Здесь вы можете обновить свои данные для текущего сезона.\n\n"
            "На сезон каждому игроку доступны:\n"
            f"🔹 **{PROFILE_CHANGE_LIMIT} смена никнейма**.\n"
            f"🔹 **{PROFILE_CHANGE_LIMIT} смена ролей (игровых позиций)**.\n\n"
            "Смена никнейма и смена ролей расходуются отдельно."
        ),
        color=discord.Color.blue(),
    )
