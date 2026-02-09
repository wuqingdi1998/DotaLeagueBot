import discord
import re
import traceback
from discord.ext import commands
from discord import ui

# Импортируем сервис и модели
from services.league_service import LeagueService
from database.models import Player

# Логгер (заглушка, если нет модуля)
try:
    from utils.logger import send_log
except ImportError:
    async def send_log(*args, **kwargs):
        print(f"[LOG] {kwargs.get('title')}: {kwargs.get('description')}")


# =============================================================
# 1. МОДАЛКИ (MODALS)
# =============================================================

class ChangeNickModal(ui.Modal, title="Смена никнейма"):
    # Поля ввода
    new_nick = ui.TextInput(
        label="Новый никнейм",
        placeholder="Введите новый ник...",
        min_length=2,
        max_length=16,
        required=True
    )

    def __init__(self, cog_instance):
        super().__init__()
        self.cog = cog_instance

    async def on_submit(self, interaction: discord.Interaction):
        # Откладываем ответ, так как работа с БД может занять время
        await interaction.response.defer(ephemeral=True)

        try:
            nick_value = self.new_nick.value

            # 1. Валидация символов (Буквы, цифры, _, -, точка, пробел)
            if not re.match(r"^[a-zA-Z0-9_а-яА-ЯёЁ \-\.]+$", nick_value):
                return await interaction.followup.send("❌ Ник содержит недопустимые символы.", ephemeral=True)

            # 2. Получаем session_maker из бота
            session_maker = interaction.client.session_maker
            if not session_maker:
                return await interaction.followup.send("❌ Ошибка: Нет соединения с БД.", ephemeral=True)

            # 3. Открываем сессию
            async with session_maker() as session:
                service = LeagueService(session)  # Передаем сессию в сервис!

                # Выполняем смену ника
                # Ожидаем, что сервис вернет (True, (old_nick, remaining)) или (False, "Ошибка")
                success, result = await service.change_nickname(interaction.user.id, nick_value)

                if success:
                    # Распаковка результата
                    old_nick, remaining = result if isinstance(result, tuple) else ("Неизвестно", "?")

                    # Получаем обновленного игрока для синхронизации
                    player = await service.get_player_by_id(interaction.user.id)

                    if player:
                        # Обновляем профиль в Discord (вызываем метод из кога)
                        await self.cog.update_discord_profile(interaction.user, player)

                        msg = f"✅ Ник успешно изменен на **{nick_value}**.\n*(Профиль Discord синхронизирован)*"
                        await interaction.followup.send(msg, ephemeral=True)

                        # --- ЛОГИРОВАНИЕ ---
                        ADMIN_ID = 311247030422863882  # ID админа для уведомлений

                        log_desc = (
                            f"👤 **Игрок:** {interaction.user.mention}\n"
                            f"📤 **Было:** `{old_nick}`\n"
                            f"📥 **Стало:** `{nick_value}`\n"
                            f"🔢 **Осталось смен:** {remaining}"
                        )

                        await send_log(
                            title="📝 Смена никнейма",
                            description=log_desc,
                            color=discord.Color.orange(),
                            content=f"🔔 <@{ADMIN_ID}>"  # Пинг админа (если поддерживается логгером)
                        )
                    else:
                        await interaction.followup.send("✅ Ник в БД изменен, но профиль игрока не найден.",
                                                        ephemeral=True)
                else:
                    # Если ошибка (например, кончились попытки)
                    await interaction.followup.send(f"❌ Ошибка: {result}", ephemeral=True)

        except Exception as e:
            print(f"🔥 ОШИБКА ChangeNickModal: {e}")
            traceback.print_exc()
            await interaction.followup.send("Произошла критическая ошибка при смене ника.", ephemeral=True)


class ChangeRolesModal(ui.Modal, title="Смена позиций"):
    roles_input = ui.TextInput(
        label="Позиции (Например: 1/2)",
        placeholder="1/2",
        min_length=3,
        max_length=3,
        required=True
    )

    def __init__(self, cog_instance):
        super().__init__()
        self.cog = cog_instance

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)

        try:
            raw_value = self.roles_input.value

            # 1. Валидация формата (цифра/цифра)
            match = re.match(r"^([1-5])/([1-5])$", raw_value)
            if not match:
                return await interaction.followup.send("❌ Неверный формат! Используйте: 1/2 (цифры от 1 до 5)",
                                                       ephemeral=True)

            pos1, pos2 = match.groups()
            if pos1 == pos2:
                return await interaction.followup.send("❌ Позиции не могут быть одинаковыми.", ephemeral=True)

            new_roles = [pos1, pos2]  # Список для БД (или строка "1/2", зависит от реализации сервиса)

            # 2. Подключение к БД
            session_maker = interaction.client.session_maker
            if not session_maker:
                return await interaction.followup.send("❌ Ошибка БД.", ephemeral=True)

            async with session_maker() as session:
                service = LeagueService(session)  # Передаем сессию!

                # Вызываем метод сервиса
                success, msg = await service.change_roles(interaction.user.id, new_roles)

                if success:
                    # Обновляем профиль в дискорде
                    player = await service.get_player_by_id(interaction.user.id)
                    if player:
                        await self.cog.update_discord_profile(interaction.user, player)
                        msg += "\n*(Роли Discord обновлены)*"

                    await interaction.followup.send(f"✅ {msg}", ephemeral=True)

                    # Логирование
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
# 2. VIEW (Кнопки меню)
# =============================================================

class ProfileManageView(ui.View):
    def __init__(self):
        super().__init__(timeout=None)  # timeout=None важно для Persistent Views

    @ui.button(label="Сменить ник", style=discord.ButtonStyle.primary, emoji="✏️", custom_id="profile:change_nick")
    async def change_nick_btn(self, interaction: discord.Interaction, button: ui.Button):
        # Получаем ког Profile, чтобы передать его в модалку (для доступа к update_discord_profile)
        cog = interaction.client.get_cog("Profile")
        if cog:
            await interaction.response.send_modal(ChangeNickModal(cog))
        else:
            await interaction.response.send_message("❌ Ошибка: Ког Profile не загружен.", ephemeral=True)

    @ui.button(label="Сменить роли", style=discord.ButtonStyle.secondary, emoji="🎭", custom_id="profile:change_roles")
    async def change_roles_btn(self, interaction: discord.Interaction, button: ui.Button):
        cog = interaction.client.get_cog("Profile")
        if cog:
            await interaction.response.send_modal(ChangeRolesModal(cog))
        else:
            await interaction.response.send_message("❌ Ошибка: Ког Profile не загружен.", ephemeral=True)


# =============================================================
# 3. COG (Логика команд и обновлений)
# =============================================================

class Profile(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name="settings")
    async def settings_cmd(self, ctx):
        """Команда для вызова меню настроек"""
        await ctx.send("⚙️ **Настройки профиля:**", view=ProfileManageView())

    async def update_discord_profile(self, member: discord.Member, player_data: Player):
        """
        Обновляет никнейм и роли пользователя в Discord
        на основе данных из объекта Player.
        """
        try:
            # --- 1. Обновление НИКА ---
            real_name = getattr(player_data, 'real_name', "Player") or "Player"
            ingame_name = getattr(player_data, 'ingame_name', "Unknown")
            positions_str = getattr(player_data, 'positions', "")

            # Формат: "Имя (Ник) 1/2"
            new_nick = f"{real_name} ({ingame_name}) {positions_str}"

            # Обрезаем, если длиннее 32 символов (лимит Discord)
            if len(new_nick) > 32:
                new_nick = new_nick[:31] + "…"

            if member.display_name != new_nick:
                try:
                    await member.edit(nick=new_nick)
                except discord.Forbidden:
                    print(f"[WARN] Нет прав на смену ника для {member.display_name}")
                except Exception as e:
                    print(f"[WARN] Ошибка смены ника: {e}")

            # --- 2. Обновление РОЛЕЙ ---
            # Карта ролей позиций
            pos_roles_map = {
                "1": "Керри",
                "2": "Мид",
                "3": "Оффлэйнер",
                "4": "Поддержка",
                "5": "Полная поддержка"
            }
            # Карта ролей рангов (примерная логика)
            rank_names = {
                1: "Рекрут", 2: "Страж", 3: "Рыцарь", 4: "Герой",
                5: "Легенда", 6: "Властелин", 7: "Божество", 8: "Титан"
            }

            roles_to_add = []

            # А. Роли Позиций
            if positions_str:
                # Если positions это "1/2", разбиваем
                parts = str(positions_str).replace('/', ' ').split()
                for p_num in parts:
                    r_name = pos_roles_map.get(p_num.strip())
                    if r_name:
                        role = discord.utils.get(member.guild.roles, name=r_name)
                        if role: roles_to_add.append(role)

            # Б. Роль Ранга
            rank_tier = getattr(player_data, 'rank_tier', 0)
            if rank_tier:
                tier_index = int(rank_tier) // 10  # 80 -> 8
                target_rank_name = rank_names.get(tier_index)
                if target_rank_name:
                    role = discord.utils.get(member.guild.roles, name=target_rank_name)
                    if role: roles_to_add.append(role)

            # --- СИНХРОНИЗАЦИЯ РОЛЕЙ ---
            if not roles_to_add:
                return  # Если нечего добавлять, выходим

            current_roles = member.roles
            ids_to_add = [r.id for r in roles_to_add]

            # Список всех возможных управляемых ролей (чтобы снять лишние)
            all_managed_names = list(rank_names.values()) + list(pos_roles_map.values())

            # Снимаем те управляемые роли, которых нет в списке добавления
            roles_to_remove = [
                r for r in current_roles
                if r.name in all_managed_names and r.id not in ids_to_add
            ]

            if roles_to_remove:
                await member.remove_roles(*roles_to_remove)

            # Добавляем новые (которых еще нет)
            final_add = [r for r in roles_to_add if r not in current_roles]
            if final_add:
                await member.add_roles(*final_add)

        except Exception as e:
            print(f"[ERROR] Ошибка синхронизации профиля: {e}")
            traceback.print_exc()


async def setup(bot):
    await bot.add_cog(Profile(bot))