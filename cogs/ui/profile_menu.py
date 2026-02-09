import discord
import re
import traceback
from discord.ext import commands
from discord import ui

# --- ИМПОРТЫ ТВОИХ МОДУЛЕЙ ---
from services.league_service import LeagueService
from database.models import Player

# Логгер
try:
    from utils.logger import send_log
except ImportError:
    async def send_log(*args, **kwargs):
        print(f"[LOG] {kwargs.get('title')}: {kwargs.get('description')}")


# =============================================================
# 1. МОДАЛКИ
# =============================================================

class ChangeNickModal(ui.Modal, title="Смена никнейма"):
    new_nick = ui.TextInput(label="Новый никнейм", min_length=2, max_length=16, required=True)

    def __init__(self, cog_instance):
        super().__init__()
        self.cog = cog_instance

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)

        try:
            nick_value = self.new_nick.value

            # Валидация
            if not re.match(r"^[a-zA-Z0-9_а-яА-ЯёЁ \-\.]+$", nick_value):
                return await interaction.followup.send("❌ Ник содержит недопустимые символы.", ephemeral=True)

            service = LeagueService(interaction.client)

            success, result = await service.change_nickname(interaction.user.id, nick_value)

            if success:
                # Получаем старый ник и оставшиеся попытки
                old_nick, remaining = result if isinstance(result, tuple) else ("Неизвестно", "?")

                # Получаем данные игрока
                player = await service.get_player_by_id(interaction.user.id)

                if player:
                    # Синхронизация профиля в Discord
                    await self.cog.update_discord_profile(interaction.user, player)

                    msg = f"✅ Ник изменен на **{nick_value}**.\n*(Профиль синхронизирован)*"
                    await interaction.followup.send(msg, ephemeral=True)

                    # --- ЛОГИРОВАНИЕ С ИСТОРИЕЙ И ПИНГОМ ---
                    log_desc = (
                        f"👤 **Игрок:** {interaction.user.mention}\n"
                        f"📤 **Было:** `{old_nick}`\n"
                        f"📥 **Стало:** `{nick_value}`\n"
                        f"🔢 **Осталось смен:** {remaining}"
                    )

                    # ID Админа для пинга
                    ADMIN_ID = 346583856285628562

                    # Вызываем логгер
                    await send_log(
                        title="📝 Смена никнейма",
                        description=log_desc,
                        color=discord.Color.orange(),
                        content=f"🔔 <@{ADMIN_ID}>"  # <--- ПИНГ ТЕПЕРЬ СРАБОТАЕТ!
                    )
                else:
                    await interaction.followup.send("✅ Ник изменен, но профиль не найден для обновления.",
                                                    ephemeral=True)
            else:
                await interaction.followup.send(f"❌ {result}", ephemeral=True)

        except Exception as e:
            print(f"🔥 ОШИБКА ChangeNickModal: {e}")
            traceback.print_exc()
            await interaction.followup.send("Произошла ошибка при смене ника.", ephemeral=True)


class ChangeRolesModal(ui.Modal, title="Смена позиций"):
    roles_input = ui.TextInput(label="Позиции (1/2)", placeholder="1/2", min_length=3, max_length=3, required=True)

    def __init__(self, cog_instance):
        super().__init__()
        self.cog = cog_instance

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)

        try:
            raw_value = self.roles_input.value

            match = re.match(r"^([1-5])/([1-5])$", raw_value)
            if not match:
                return await interaction.followup.send("❌ Формат: 1/2 (где цифры 1-5)", ephemeral=True)

            pos1, pos2 = match.groups()
            if pos1 == pos2:
                return await interaction.followup.send("❌ Позиции не могут совпадать.", ephemeral=True)

            new_roles = [pos1, pos2]

            # --- ИСПРАВЛЕНИЕ ТУТ ---
            service = LeagueService(interaction.client)

            success, msg = await service.change_roles(interaction.user.id, new_roles)

            if success:
                player = await service.get_player_by_id(interaction.user.id)
                if player:
                    await self.cog.update_discord_profile(interaction.user, player)
                    msg += "\n*(Роли в Discord обновлены)*"

                await interaction.followup.send(msg, ephemeral=True)

                await send_log(
                    title="🎭 Смена ролей",
                    description=f"Игрок {interaction.user.mention} сменил роли на `{raw_value}`",
                    color=discord.Color.blue()
                )
            else:
                await interaction.followup.send(f"❌ {msg}", ephemeral=True)

        except Exception as e:
            print(f"🔥 ОШИБКА ChangeRolesModal: {e}")
            traceback.print_exc()
            await interaction.followup.send("Произошла ошибка при смене ролей.", ephemeral=True)


# =============================================================
# 2. VIEW
# =============================================================

class ProfileManageView(ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @ui.button(label="Сменить ник", style=discord.ButtonStyle.primary, emoji="✏️", custom_id="profile:change_nick")
    async def change_nick_btn(self, interaction: discord.Interaction, button: ui.Button):
        cog = interaction.client.get_cog("Profile")
        if cog:
            await interaction.response.send_modal(ChangeNickModal(cog))
        else:
            await interaction.response.send_message("❌ Ошибка: модуль Profile не загружен.", ephemeral=True)

    @ui.button(label="Сменить роли", style=discord.ButtonStyle.secondary, emoji="🎭", custom_id="profile:change_roles")
    async def change_roles_btn(self, interaction: discord.Interaction, button: ui.Button):
        cog = interaction.client.get_cog("Profile")
        if cog:
            await interaction.response.send_modal(ChangeRolesModal(cog))
        else:
            await interaction.response.send_message("❌ Ошибка: модуль Profile не загружен.", ephemeral=True)


# =============================================================
# 3. COG
# =============================================================

class Profile(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name="settings")
    async def settings_cmd(self, ctx):
        await ctx.send("⚙️ **Настройки профиля:**", view=ProfileManageView())

    async def update_discord_profile(self, member: discord.Member, player_data: Player):
        """Обновляет ник и роли в Discord на основе данных из БД."""
        try:
            # 1. Ник
            real_name = getattr(player_data, 'real_name', None) or "Игрок"
            ingame_name = getattr(player_data, 'ingame_name', "Unknown")
            positions_str = getattr(player_data, 'positions', "")

            new_nick = f"{real_name} ({ingame_name}) {positions_str}"

            if len(new_nick) > 32:
                new_nick = new_nick[:31] + "…"

            if member.display_name != new_nick:
                try:
                    await member.edit(nick=new_nick)
                except discord.Forbidden:
                    print(f"[WARN] Нет прав сменить ник {member.display_name}")

            # 2. Роли
            pos_roles_map = {
                "1": "Керри", "2": "Мид", "3": "Оффлэйнер",
                "4": "Поддержка", "5": "Полная поддержка"
            }
            rank_names = {
                1: "Рекрут", 2: "Страж", 3: "Рыцарь", 4: "Герой",
                5: "Легенда", 6: "Властелин", 7: "Божество", 8: "Титан"
            }

            roles_to_add = []

            # Позиции
            if positions_str and "/" in positions_str:
                parts = positions_str.split('/')
                for p_num in parts:
                    r_name = pos_roles_map.get(p_num.strip())
                    if r_name:
                        r = discord.utils.get(member.guild.roles, name=r_name)
                        if r: roles_to_add.append(r)

            # Ранг
            rank_tier = getattr(player_data, 'rank_tier', 0)
            tier_index = (rank_tier // 10) if rank_tier else 0
            target_rank_name = rank_names.get(tier_index)

            if target_rank_name:
                r = discord.utils.get(member.guild.roles, name=target_rank_name)
                if r: roles_to_add.append(r)

            # Синхронизация
            current_roles = member.roles
            ids_to_add = [r.id for r in roles_to_add]
            all_managed = list(rank_names.values()) + list(pos_roles_map.values())

            roles_to_remove = [
                r for r in current_roles
                if r.name in all_managed and r.id not in ids_to_add
            ]

            if roles_to_remove:
                await member.remove_roles(*roles_to_remove)

            final_add = [r for r in roles_to_add if r not in current_roles]
            if final_add:
                await member.add_roles(*final_add)

        except Exception as e:
            print(f"[ERROR] Ошибка синхронизации профиля: {e}")
            traceback.print_exc()


async def setup(bot):
    await bot.add_cog(Profile(bot))