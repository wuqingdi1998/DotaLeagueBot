import discord
import re  # 👈 ОБЯЗАТЕЛЬНО ДОБАВЬ ЭТОТ ИМПОРТ
from discord import ui
from services.league_service import LeagueService


# --- 1. МОДАЛЬНОЕ ОКНО ДЛЯ НИКА (С валидацией спецсимволов) ---
class ChangeNickModal(ui.Modal, title="Смена никнейма"):
    new_nick = ui.TextInput(
        label="Новый никнейм",
        placeholder="Введите ник (2-32 символа)...",
        min_length=2,
        max_length=32,
        required=True
    )

    async def on_submit(self, interaction: discord.Interaction):
        nick_value = self.new_nick.value

        # --- ВАЛИДАЦИЯ (КАК ПРИ РЕГИСТРАЦИИ) ---
        forbidden_pool = "~`!@#$:;%^&*(){}[]/<>"
        count = sum(1 for char in nick_value if char in forbidden_pool)

        if count > 1:
            await interaction.response.send_message(
                f"❌ **Ошибка:** В никнейме разрешен максимум **1** спецсимвол из списка: `{forbidden_pool}`.\n"
                f"У вас найдено: **{count}**.",
                ephemeral=True
            )
            return

        # Если проверка прошла — идем в сервис
        # (Сервис внутри себя проверит лимит смен = 1)
        async with interaction.client.session_maker() as session:
            service = LeagueService(session)
            success, msg = await service.change_nickname(interaction.user.id, nick_value)

        # Если смена успешна — можно попробовать обновить ник в дискорде
        if success:
            try:
                await interaction.user.edit(nick=nick_value)
                msg += "\n*(Ник на сервере обновлен)*"
            except discord.Forbidden:
                pass  # Нет прав менять ник админу или владельцу

        await interaction.response.send_message(msg, ephemeral=True)


# --- 2. МОДАЛЬНОЕ ОКНО ДЛЯ РОЛЕЙ (Строгий формат 1/2) ---
class ChangeRolesModal(ui.Modal, title="Смена позиций"):
    roles_input = ui.TextInput(
        label="Позиции (Формат: 1/2)",
        placeholder="Например: 4/5",
        min_length=3,
        max_length=3,  # Строго 3 символа (цифра, слэш, цифра)
        required=True
    )

    async def on_submit(self, interaction: discord.Interaction):
        raw_value = self.roles_input.value

        # --- ВАЛИДАЦИЯ (КАК ПРИ РЕГИСТРАЦИИ) ---
        # Проверяем строго формат "Цифра/Цифра"
        match = re.match(r"^([1-5])/([1-5])$", raw_value)

        if not match:
            await interaction.response.send_message(
                "❌ **Ошибка формата!**\nУкажите строго две позиции через слэш.\nПример: `1/2` или `4/5`.",
                ephemeral=True
            )
            return

        pos1, pos2 = match.groups()

        if pos1 == pos2:
            await interaction.response.send_message(
                "❌ **Ошибка:** Позиции не могут быть одинаковыми.",
                ephemeral=True
            )
            return

        # --- СОХРАНЕНИЕ ---
        # Передаем список, сервис сам склеит их через слэш и проверит лимиты
        new_roles = [pos1, pos2]

        async with interaction.client.session_maker() as session:
            service = LeagueService(session)
            success, msg = await service.change_roles(interaction.user.id, new_roles)

        await interaction.response.send_message(msg, ephemeral=True)


# --- 3. ГЛАВНОЕ МЕНЮ (КНОПКИ) ---
class ProfileManageView(ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @ui.button(label="Сменить ник", style=discord.ButtonStyle.primary, emoji="✏️", custom_id="profile:change_nick")
    async def change_nick_btn(self, interaction: discord.Interaction, button: ui.Button):
        await interaction.response.send_modal(ChangeNickModal())

    @ui.button(label="Сменить роли", style=discord.ButtonStyle.secondary, emoji="🎭", custom_id="profile:change_roles")
    async def change_roles_btn(self, interaction: discord.Interaction, button: ui.Button):
        await interaction.response.send_modal(ChangeRolesModal())