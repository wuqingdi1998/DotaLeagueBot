import discord
import re  # 👈 ОБЯЗАТЕЛЬНО ДОБАВЬ ЭТОТ ИМПОРТ
from discord import ui
from services.league_service import LeagueService


async def update_display_name(member: discord.Member, player_data):
    """
    Формирует правильный никнейм на основе данных игрока.
    Пример формата: [1000] Nickname (1/2)
    Настрой формат (f-строку) под себя!
    """
    # Если player_data — это объект SQLAlchemy, обращаемся через точку.
    # Если словарь — через []. Предполагаем объект, как в admin_edit_player.

    mmr = player_data.mmr
    nickname = player_data.ingame_name
    # positions = player_data.positions # Если нужно отображать позиции в нике

    # --- НАСТРОЙ ФОРМАТ НИКА ТУТ ---
    # Например: "1500 | PlayerName"
    new_nick = f"{mmr} | {nickname}"

    # Если используешь позиции в нике:
    # new_nick = f"[{mmr}] {nickname} ({player_data.positions})"

    try:
        # Проверка, чтобы не менять ник на тот же самый (избегаем лишних запросов API)
        if member.display_name != new_nick:
            await member.edit(nick=new_nick)
            return True
    except discord.Forbidden:
        print(f"Не хватает прав сменить ник пользователю {member.id}")
    except Exception as e:
        print(f"Ошибка смены ника: {e}")

    return False


# --- 1. МОДАЛЬНОЕ ОКНО ДЛЯ НИКА ---
class ChangeNickModal(ui.Modal, title="Смена никнейма"):
    new_nick = ui.TextInput(label="Новый никнейм", min_length=2, max_length=16, required=True)

    def __init__(self, cog_instance): # Передаем экземпляр кога, чтобы вызвать update_discord_profile
        super().__init__()
        self.cog = cog_instance

    async def on_submit(self, interaction: discord.Interaction):
        nick_value = self.new_nick.value
        # (Тут твоя валидация спецсимволов...)

        async with interaction.client.session_maker() as session:
            service = LeagueService(session)
            success, msg = await service.change_nickname(interaction.user.id, nick_value)

            if success:
                # Получаем свежие данные игрока
                player = await service.get_player_by_id(interaction.user.id)
                if player:
                    # ВЫЗЫВАЕМ ТВОЙ ОБРАЗЕЦ СИНХРОНИЗАЦИИ
                    await self.cog.update_discord_profile(interaction.user, player)
                    msg += "\n*(Профиль синхронизирован)*"

        await interaction.response.send_message(msg, ephemeral=True)


class ChangeRolesModal(ui.Modal, title="Смена позиций"):
    roles_input = ui.TextInput(label="Позиции (1/2)", min_length=3, max_length=3, required=True)

    def __init__(self, cog_instance):
        super().__init__()
        self.cog = cog_instance

    async def on_submit(self, interaction: discord.Interaction):
        raw_value = self.roles_input.value
        # (Тут твоя проверка формата через re.match и pos1 == pos2...)

        match = re.match(r"^([1-5])/([1-5])$", raw_value)
        pos1, pos2 = match.groups()
        new_roles = [pos1, pos2]

        async with interaction.client.session_maker() as session:
            service = LeagueService(session)
            success, msg = await service.change_roles(interaction.user.id, new_roles)

            if success:
                player = await service.get_player_by_id(interaction.user.id)
                if player:
                    # ВЫЗЫВАЕМ ТВОЙ ОБРАЗЕЦ СИНХРОНИЗАЦИИ
                    await self.cog.update_discord_profile(interaction.user, player)
                    msg += "\n*(Роли в Discord обновлены)*"

        await interaction.response.send_message(msg, ephemeral=True)


# --- 3. ГЛАВНОЕ МЕНЮ (КНОПКИ) ---
class ProfileManageView(ui.View):
    def __init__(self):
        # Убираем cog_instance, чтобы main.py не ругался
        super().__init__(timeout=None)

    @ui.button(label="Сменить ник", style=discord.ButtonStyle.primary, emoji="✏️", custom_id="profile:change_nick")
    async def change_nick_btn(self, interaction: discord.Interaction, button: ui.Button):
        # Находим ког динамически через client (bot)
        # Укажи здесь точное имя твоего класса кога (обычно это имя класса в profile.py)
        cog = interaction.client.get_cog("Profile")
        await interaction.response.send_modal(ChangeNickModal(cog))

    @ui.button(label="Сменить роли", style=discord.ButtonStyle.secondary, emoji="🎭", custom_id="profile:change_roles")
    async def change_roles_btn(self, interaction: discord.Interaction, button: ui.Button):
        cog = interaction.client.get_cog("Profile")
        await interaction.response.send_modal(ChangeRolesModal(cog))