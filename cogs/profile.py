import discord
from discord import app_commands, ui
from discord.ext import commands, tasks
from discord.ui import View, Modal, TextInput, Button, Select
import aiohttp
import re
import asyncio
import os
from sqlalchemy import select
from dotenv import load_dotenv

# --- Project Imports ---
from database.core import async_session
from database.models import Player, Team
from utils.logger import send_log
from utils.steam_tools import resolve_steam_id

GUILD_ID = int(os.getenv("GUILD_ID"))

class RegisterModal(ui.Modal, title='Регистрация в Лиге'):
    real_name = ui.TextInput(label='Ваше настоящее имя', placeholder=' Например: Даня', min_length=2, max_length=15)
    nickname = ui.TextInput(label='Ваш никнейм в лиге', placeholder='Например: Dendi', min_length=2, max_length=20)
    pos = ui.TextInput(label='Ваши позиции (через дробь)', placeholder='Например: 1/2', min_length=3, max_length=3)
    steam = ui.TextInput(label='Steam ID или ссылка', placeholder='Вставьте ID32 или ссылку')

    async def on_submit(self, interaction: discord.Interaction):
        # --- 1. ВАЛИДАЦИЯ НИКА (Спецсимволы) ---
        forbidden_pool = "~`!@#$:;%^&*(){}[]/<>"
        count = sum(1 for char in self.nickname.value if char in forbidden_pool)
        if count > 1:
            return await interaction.response.send_message(
                f"❌ Ошибка: В никнейме разрешен максимум **1** спецсимвол из списка: `{forbidden_pool}`.\n"
                f"У вас найдено: **{count}**.",
                ephemeral=True
            )

        # --- 2. ВАЛИДАЦИЯ ПОЗИЦИЙ (Формат 1/2) ---
        match = re.match(r"^([1-5])/([1-5])$", self.pos.value)
        if not match:
            return await interaction.response.send_message("❌ **Ошибка:** Укажите позиции в формате `1/2`.",
                                                           ephemeral=True)

        pos1, pos2 = match.groups()
        if pos1 == pos2:
            return await interaction.response.send_message("❌ **Ошибка:** Позиции не могут быть одинаковыми.",
                                                           ephemeral=True)

        # --- 3. ФОРМАТИРОВАНИЕ ИМЕНИ (Новое) ---
        # .strip() убирает пробелы по краям
        # .title() делает первую букву заглавной (dany -> Dany, dany kos -> Dany Kos)
        formatted_real_name = self.real_name.value.strip().title()

        await interaction.response.defer(ephemeral=True)

        sid32 = await resolve_steam_id(self.steam.value)
        if not sid32:
            return await interaction.followup.send("❌ **Ошибка:** Неверный формат Steam ID.", ephemeral=True)

        # --- 4. ЗАПРОС К OPENDOTA ---
        url = f"https://api.opendota.com/api/players/{sid32}"
        async with aiohttp.ClientSession() as hs:
            async with hs.get(url) as res:
                data = await res.json() if res.status == 200 else {}

        rank = data.get('rank_tier', 0)
        avatar = data.get('profile', {}).get('avatarfull', None)

        # --- 5. ЗАПИСЬ В БД ---
        async with async_session() as session:
            existing_p = (await session.execute(
                select(Player).where(Player.discord_id == interaction.user.id))).scalar_one_or_none()
            if existing_p:
                return await interaction.followup.send("❌ Вы уже зарегистрированы.", ephemeral=True)

            new_p = Player(
                discord_id=interaction.user.id,
                steam_id32=sid32,
                real_name=formatted_real_name,  # 👈 ИСПОЛЬЗУЕМ ОТФОРМАТИРОВАННОЕ ИМЯ
                ingame_name=self.nickname.value,
                positions=self.pos.value,
                rank_tier=rank,
                avatar_url=avatar
            )
            session.add(new_p)
            await session.commit()

            print(f"[DB] New player registered: {self.nickname.value} (ID: {interaction.user.id})")

            # --- AUTO-UPDATE DISCORD PROFILE ---
            cog = interaction.client.get_cog("Profile")
            if cog:
                await cog.update_discord_profile(interaction.user, new_p)

        # --- 6. ЛОГИРОВАНИЕ ---
        await send_log(
            title="🆕 Новая регистрация",
            description=f"Игрок: {interaction.user.mention}\nНик: `{self.nickname.value}`\nИмя: `{formatted_real_name}`\nSteam: `{sid32}`",
            color=discord.Color.green()
        )

        await interaction.followup.send(f"✅ Регистрация успешна! Добро пожаловать, {formatted_real_name}!",
                                        ephemeral=True)

class RegistrationView(ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @ui.button(label="Регистрация", style=discord.ButtonStyle.green, custom_id="reg_btn_persistent")
    async def reg_button(self, interaction: discord.Interaction, button: ui.Button):
        await interaction.response.send_modal(RegisterModal())

class Profile(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.update_ranks_task.start()
        self.bot.add_view(RegistrationView())

    def cog_unload(self):
        self.update_ranks_task.cancel()

    # --- HELPER: Sync Nickname & Roles ---
    async def update_discord_profile(self, member: discord.Member, player_data: Player):
        """Updates Discord nickname to 'Nick (Pos)' and assigns rank role."""
        try:
            # 1. Nickname
            new_nick = f"{player_data.real_name} ({player_data.ingame_name}) {player_data.positions}"
            if len(new_nick) > 32: new_nick = new_nick[:32]

            if member.nick != new_nick:
                await member.edit(nick=new_nick)
                print(f"[DISCORD] Nick updated: {member.display_name} -> {new_nick}")

            # 2. Roles

            pos_roles_map = {
                "1": "Керри",
                "2": "Мид",
                "3": "Оффлэйнер",
                "4": "Поддержка",
                "5": "Полная поддержка"
            }
            primary_pos = player_data.positions.split('/')[0]
            second_pos = player_data.positions.split('/')[1]
            target_pos_names = []
            if primary_pos:
                name = pos_roles_map[primary_pos]
                name2 = pos_roles_map[second_pos]
                if name:
                    target_pos_names.append(name)
                if name2:
                    target_pos_names.append(name2)



            rank_names = {
                1: "Рекрут", 2: "Страж", 3: "Рыцарь", 4: "Герой",
                5: "Легенда", 6: "Властелин", 7: "Божество", 8: "Титан"
            }
            target_rank_name = rank_names.get((player_data.rank_tier // 10) if player_data.rank_tier else 0)

            all_managed_roles = list(rank_names.values()) + list(pos_roles_map.values())
            roles_to_remove = []
            roles_to_add = []

            if target_rank_name:
                r = discord.utils.get(member.guild.roles, name=target_rank_name)
                if r: roles_to_add.append(r)

            for i, pos_name in enumerate(target_pos_names):
                if i == 0:
                    target_color = discord.Color.gold()
                else:
                    target_color = discord.Color.default()
                p = discord.utils.get(member.guild.roles, name=pos_name, color=target_color)
                if p:
                    roles_to_add.append(p)
                else:
                    print(f"[WARN] Не нашел роль '{pos_name}' с цветом {target_color}")

            ids_to_add = [r.id for r in roles_to_add]
            for role in member.roles:
                if role.name in all_managed_roles and role.id not in ids_to_add:
                    roles_to_remove.append(role)

            if roles_to_remove:
                await member.remove_roles(*roles_to_remove)

            if roles_to_add:
                final_add = [r for r in roles_to_add if r not in member.roles]
                if final_add:
                    await member.add_roles(*roles_to_add)

        except discord.Forbidden:
            print(f"[WARN] Missing permissions to edit {member.display_name}")
        except Exception as e:
            print(f"[ERROR] Profile sync failed: {e}")

    # --- COMMANDS ---

    @app_commands.command(name="setup_registration", description="[Admin] Разместить кнопку регистрации")
    @app_commands.checks.has_permissions(administrator=True)
    async def setup_reg(self, interaction: discord.Interaction):
        await interaction.response.send_message("Создаю чистую кнопку...", ephemeral=True)

        webhook = await interaction.channel.create_webhook(name="League Registration")

        await webhook.send(
            content="# 🏆 Регистрация в Лиге\nНажмите кнопку ниже, чтобы заполнить анкету и получить доступ к каналам.",
            view=RegistrationView(),
            username=self.bot.user.name,
            avatar_url=self.bot.user.display_avatar.url
        )
        await webhook.delete()

    @app_commands.command(name="admin_delete_player", description="[Admin] Удалить игрока (База + Роли + Ник)")
    @app_commands.describe(member="Игрок")
    @app_commands.checks.has_permissions(administrator=True)
    async def admin_delete_player(self, interaction: discord.Interaction, member: discord.Member):
        await interaction.response.defer(ephemeral=True)

        # 1. DB DELETE
        async with async_session() as session:
            player = await session.get(Player, member.id)
            if player:
                await session.delete(player)
                await session.commit()
                db_msg = "✅ Удален из базы."
            else:
                db_msg = "⚠️ Не был в базе."

        # 2. DISCORD CLEANUP
        report = []

        try:
            member = await interaction.guild.fetch_member(member.id)
        except:
            pass

        try:
            if member.nick:
                await member.edit(nick=None)
                report.append("Ник сброшен")
        except discord.Forbidden:
            report.append("ОШИБКА: Нет прав менять ник (Роль бота ниже?)")
        except Exception as e:
            print(f"[ERROR] Nick reset: {e}")

        target_names = [
            "Herald", "Guardian", "Crusader", "Archon",
            "Legend", "Ancient", "Divine", "Immortal"
        ]

        to_remove = []
        print(f"\n[DEBUG] Роли у {member.display_name}: {[r.name for r in member.roles]}")

        for role in member.roles:
            if role.name in target_names:
                to_remove.append(role)

        print(f"[DEBUG] Бот пытается снять роли: {[r.name for r in to_remove]}")

        if to_remove:
            try:
                await member.remove_roles(*to_remove)
                report.append(f"Роли сняты: {', '.join([r.name for r in to_remove])}")
            except discord.Forbidden:
                report.append("⛔ ОШИБКА: Роль бота НИЖЕ, чем роль ранга!")
                print("[ERROR] 403 Forbidden: Move bot role HIGHER in server settings.")
            except Exception as e:
                report.append(f"Ошибка ролей: {e}")
        else:
            report.append("Роли ранга не найдены")

        await send_log(
            title="🗑️ Игрок удален",
            description=f"Админ {interaction.user.mention} удалил игрока {member.mention}.",
            color=discord.Color.red()
        )
        await interaction.followup.send(f"🗑️ **Результат:**\n1. {db_msg}\n2. {', '.join(report)}")

    @app_commands.command(name="admin_edit_player", description="[Admin] Изменить данные игрока")
    @app_commands.checks.has_permissions(administrator=True)
    async def admin_edit_player(self, interaction: discord.Interaction, member: discord.Member,
                                new_real_name: str = None, new_nick: str = None, new_positions: str = None, new_steam: str = None):
        await interaction.response.defer(ephemeral=True)

        changes = []

        async with async_session() as session:
            player = await session.get(Player, member.id)
            if not player: return await interaction.followup.send("❌ Игрок не найден.")
            if new_real_name:
                player.real_name = new_real_name
                changes.append(f"📝 **Имя:** `{new_real_name}`")
            if new_nick:
                player.ingame_name = new_nick
                changes.append(f"🏷️ **Ник:** `{new_nick}`")
            if new_positions:
                if not re.match(r"^[1-5]/[1-5]$", new_positions): return await interaction.followup.send(
                    "❌ Неверный формат позиций.")
                player.positions = new_positions
                changes.append(f"⚔️ **Позиции:** `{new_positions}`")

            if new_steam:
                sid32 = await resolve_steam_id(new_steam)
                if sid32:
                    player.steam_id32 = sid32
                    changes.append(f"🎮 **Steam:** `{sid32}`")
                    async with aiohttp.ClientSession() as hs:
                        async with hs.get(f"https://api.opendota.com/api/players/{sid32}") as res:
                            if res.status == 200:
                                data = await res.json()
                                player.rank_tier = data.get('rank_tier', 0)
                                player.avatar_url = data.get('profile', {}).get('avatarfull', player.avatar_url)

            await session.commit()

            # --- SYNC CHANGES ---
            await self.update_discord_profile(member, player)

        await send_log(
            title="🛠️ Профиль изменен (Админ)",
            description=f"**Кто изменил:** {interaction.user.mention}\n**Кого:** {member.mention}\n\n" + "\n".join(changes),
            color=discord.Color.orange()
        )
        await interaction.followup.send(f"✅ Данные {member.mention} обновлены.")





    @app_commands.command(name="player_info", description="Показать профиль игрока и тир")
    async def player_info(self, interaction: discord.Interaction, member: discord.Member = None):
        await interaction.response.defer()
        target = member or interaction.user

        async with self.bot.session_maker() as session:  # Используй self.bot.session_maker или async_session() как у тебя настроено
            player = (await session.execute(select(Player).where(Player.discord_id == target.id))).scalar_one_or_none()

            if not player:
                return await interaction.followup.send("❌ Профиль не найден. Игрок не зарегистрирован.")

            # Если у игрока есть команда (Team)
            team_name = "No Team"
            if player.team_id:
                team = await session.get(Team, player.team_id)
                if team: team_name = team.name

            # Создаем Embed
            embed = create_player_embed(player, target)
            if player.team_id:
                embed.add_field(name="Team", value=team_name, inline=True)

            # Создаем кнопки (View)
            view = PlayerInfoView(self.bot, player.discord_id, player.ingame_name, interaction)

            await interaction.followup.send(embed=embed, view=view)

    @tasks.loop(hours=24)
    async def update_ranks_task(self):
        if not self.bot.guilds: return
        guild = self.bot.guilds[0]

        print("[TASKS] Starting mass rank update...")

        async with async_session() as session:
            players = (await session.execute(select(Player))).scalars().all()
            total_players = len(players)
            print(f"[TASKS] 1. Fetching data from OpenDota for {total_players} players...")

            updated_count = 0

            async with aiohttp.ClientSession() as hs:
                for p in players:
                    try:
                        url = f"https://api.opendota.com/api/players/{p.steam_id32}"
                        async with hs.get(url, timeout=10) as res:
                            if res.status == 200:
                                data = await res.json()
                                # Ранг может прийти как None, поэтому ставим or 0
                                new_rank = data.get('rank_tier') or 0
                                p.rank_tier = new_rank
                                updated_count += 1
                            elif res.status == 429:
                                print(f"[WARN] OpenDota Rate Limit: {p.ingame_name} (Ждем...)")
                                await asyncio.sleep(5)  # Если поймали лимит, отдыхаем подольше
                            else:
                                print(f"[ERROR] API вернул {res.status} для {p.ingame_name}")
                    except Exception as e:
                        print(f"[ERROR] Dota API fail {p.steam_id32}: {e}")

                    # ВАЖНО: Пауза 1.1 сек гарантирует, что мы не превысим 60 запросов в минуту
                    await asyncio.sleep(1.1)

            await session.commit()
            print(f"[TASKS] OpenDota data saved. Success: {updated_count}/{total_players}")

            # --- Часть 2: Обновление ников в Дискорде ---
            print("[TASKS] 2. Starting Discord profile updates...")
            for i, p in enumerate(players, 1):
                member = guild.get_member(p.discord_id)
                if member:
                    try:
                        await self.update_discord_profile(member, p)
                    except Exception as e:
                        print(f"[WARN] Missing permissions to edit {member.display_name}")

                if i % 10 == 0 or i == total_players:
                    print(f"[PROGRESS] Processed {i}/{total_players} profiles...")

                # Небольшая пауза, чтобы не спамить в API Дискорда
                await asyncio.sleep(0.5)

        print("[TASKS] Mass update completed successfully.")

    @update_ranks_task.before_loop
    async def before_tasks(self):
        await self.bot.wait_until_ready()




# --- Вставь этот класс ВЫШЕ класса PlayerInfoView в файле cogs/profile.py ---

class TierModalInternal(discord.ui.Modal):
    def __init__(self, bot, parent_view, player_id, player_name):
        super().__init__(title=f"Изменение тира: {player_name}")
        self.bot = bot
        self.parent_view = parent_view
        self.player_id = player_id

        self.tier_input = discord.ui.TextInput(
            label="Новый Тир (1-10)",
            placeholder="Введите число (например: 8)",
            min_length=1,
            max_length=2,
            required=True
        )
        self.add_item(self.tier_input)

    async def on_submit(self, interaction: discord.Interaction):
        try:
            val = int(self.tier_input.value)
            if not 1 <= val <= 10:
                raise ValueError
        except ValueError:
            return await interaction.response.send_message("❌ Ошибка: Введите число от 1 до 10.", ephemeral=True)

        # Сохранение в БД
        async with self.bot.session_maker() as session:
            stmt = select(Player).where(Player.discord_id == self.player_id)
            result = await session.execute(stmt)
            player = result.scalar_one_or_none()

            if player:
                player.internal_rating = val
                await session.commit()
                # Логируем или сообщаем об успехе
                await interaction.response.send_message(f"✅ Тир игрока **{player.ingame_name}** изменен на **{val}**.",
                                                        ephemeral=True)
            else:
                await interaction.response.send_message("❌ Игрок не найден в БД.", ephemeral=True)

class PlayerInfoView(View):
    def __init__(self, bot, player_discord_id, player_name, original_interaction):
        super().__init__(timeout=180)  # Кнопка активна 3 минуты
        self.bot = bot
        self.player_id = player_discord_id
        self.player_name = player_name
        self.original_interaction = original_interaction

    @discord.ui.button(label="Изменить тир", style=discord.ButtonStyle.secondary, emoji="⚙️")
    async def edit_tier_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        # 1. Проверка прав (только админы могут менять)
        if not interaction.user.guild_permissions.administrator:
            return await interaction.response.send_message("⛔ Только администраторы могут менять тир.", ephemeral=True)

        # 2. Открываем модалку
        # Мы передаем 'self' как parent_view, чтобы модалка могла (если нужно) обратиться назад
        # Но для обновления сообщения профиля мы используем отдельный трюк ниже.
        modal = TierModalInternal(self.bot, self, self.player_id, self.player_name)

        # Переопределяем метод on_submit у этого экземпляра модалки,
        # чтобы он обновил именно сообщение с профилем, а не таблицу
        original_on_submit = modal.on_submit

        async def custom_on_submit(modal_interaction: discord.Interaction):
            # Выполняем стандартное сохранение в БД
            await original_on_submit(modal_interaction)

            # После сохранения обновляем сам профиль (Embed)
            # Нам нужно заново получить данные игрока
            async with self.bot.session_maker() as session:
                new_player_data = (await session.execute(
                    select(Player).where(Player.discord_id == self.player_id))).scalar_one_or_none()

            if new_player_data:
                # Генерируем новый Embed с обновленным тиром
                new_embed = create_player_embed(new_player_data, interaction.guild.get_member(self.player_id))
                # Редактируем исходное сообщение (где была нажата кнопка)
                await interaction.message.edit(embed=new_embed)

        # Подменяем метод
        modal.on_submit = custom_on_submit

        await interaction.response.send_modal(modal)


# Вспомогательная функция для создания красивого Embed (чтобы не дублировать код)
def create_player_embed(player, discord_member):
    rank_names = {1: "Herald", 2: "Guardian", 3: "Crusader", 4: "Archon", 5: "Legend", 6: "Ancient",
                  7: "Divine", 8: "Immortal"}
    rank_label = rank_names.get((player.rank_tier // 10) if player.rank_tier else 0, "Uncalibrated")

    # --- ЛОГИКА ТИРА ---
    if player.internal_rating and player.internal_rating > 0:
        tier_str = f"🛠️ **{player.internal_rating}** (Manual)"
    else:
        raw = player.rank_tier or 0
        val = raw // 10 if raw >= 10 else raw
        tier_str = f"🤖 {val} (Auto)"
    # -------------------

    embed = discord.Embed(title=f"👤 {player.ingame_name}", color=discord.Color.blue())
    if player.avatar_url: embed.set_thumbnail(url=player.avatar_url)

    # Пытаемся красиво отобразить Discord юзера
    user_str = discord_member.mention if discord_member else f"<@{player.discord_id}>"

    embed.add_field(name="Discord", value=user_str, inline=True)
    embed.add_field(name="Rank", value=rank_label, inline=True)
    embed.add_field(name="League Tier", value=tier_str, inline=True)  # Добавили поле

    embed.add_field(name="Pos", value=f"`{player.positions}`", inline=True)
    embed.add_field(name="Steam", value=f"[Stratz](https://www.stratz.com/players/{player.steam_id32})",
                    inline=True)

    return embed
async def setup(bot):
    await bot.add_cog(Profile(bot))