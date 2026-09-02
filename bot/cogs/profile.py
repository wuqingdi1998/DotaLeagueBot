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
from utils.logger import send_log

# --- Project Imports ---
from database.core import async_session
from database.models import Player, Team
from utils.logger import send_log
from utils.steam_tools import resolve_steam_id
from utils.nickname_validator import NICKNAME_MAX_LENGTH, validate_nickname
from services.discord_avatar_sync import collect_discord_avatar_updates
from services.player_registration import (
    PlayerRegistrationError,
    register_or_reactivate_player,
)
from services.player_tier import effective_player_tier, set_player_tier

GUILD_ID = int(os.getenv("GUILD_ID") or 0)
NEW_USER_ROLE_ID = int(os.getenv("NEW_USER_ROLE_ID", "0"))
LEAGUE_PARTICIPANT_ROLE_ID = int(os.getenv("LEAGUE_PARTICIPANT_ROLE_ID", "0"))
DISCORD_PROFILE_SYNC_INTERVAL_HOURS = 1


RANK_BRACKETS_RU = [
    ("Рекрут (Herald)", 1),
    ("Страж (Guardian)", 2),
    ("Рыцарь (Crusader)", 3),
    ("Герой (Archon)", 4),
    ("Легенда (Legend)", 5),
    ("Властелин (Ancient)", 6),
    ("Божество (Divine)", 7),
    ("Титан (Immortal)", 8),
]

POSITION_ROLE_NAMES = {
    "1": "Керри",
    "2": "Мид",
    "3": "Оффлэйнер",
    "4": "Поддержка",
    "5": "Полная поддержка",
}


def _position_select_options() -> list[discord.SelectOption]:
    return [
        discord.SelectOption(label=f"{position} — {role_name}", value=position)
        for position, role_name in POSITION_ROLE_NAMES.items()
    ]


async def fetch_opendota_rank(steam_id32: int) -> int:
    """Return rank_tier, or 0 when OpenDota has no rank data."""
    url = f"https://api.opendota.com/api/players/{steam_id32}"
    async with aiohttp.ClientSession() as hs:
        async with hs.get(url, timeout=10) as res:
            data = await res.json() if res.status == 200 else {}
    return data.get('rank_tier') or 0

class RegisterModal(ui.Modal, title='Регистрация в Лиге'):
    real_name = ui.Label(
        text='Ваше настоящее имя',
        component=ui.TextInput(placeholder=' Например: Даня', min_length=2, max_length=15),
    )
    nickname = ui.Label(
        text='Ваш никнейм в лиге',
        component=ui.TextInput(
            placeholder='Например: Dendi',
            min_length=2,
            max_length=NICKNAME_MAX_LENGTH,
        ),
    )
    primary_position = ui.Label(
        text='Основная позиция',
        component=ui.Select(
            placeholder='Выберите основную позицию',
            options=_position_select_options(),
        ),
    )
    secondary_position = ui.Label(
        text='Дополнительная позиция',
        component=ui.Select(
            placeholder='Выберите дополнительную позицию',
            options=_position_select_options(),
        ),
    )
    steam = ui.Label(
        text='Steam ID или ссылка',
        component=ui.TextInput(placeholder='Вставьте ID32 или ссылку'),
    )

    async def on_submit(self, interaction: discord.Interaction):
        # --- 1. ВАЛИДАЦИЯ НИКА ---
        nickname = self.nickname.component.value
        ok, err = validate_nickname(nickname)
        if not ok:
            return await interaction.response.send_message(f"❌ {err}", ephemeral=True)

        # --- 2. ВАЛИДАЦИЯ ПОЗИЦИЙ ---
        primary_position = self.primary_position.component.values[0]
        secondary_position = self.secondary_position.component.values[0]
        if primary_position == secondary_position:
            return await interaction.response.send_message("❌ **Ошибка:** Позиции не могут быть одинаковыми.",
                                                           ephemeral=True)
        positions = f"{primary_position}/{secondary_position}"

        # --- 3. ФОРМАТИРОВАНИЕ ИМЕНИ ---
        formatted_real_name = self.real_name.component.value.strip().title()

        # --- 3.1 ВАЛИДАЦИЯ ИМЕНИ (Только кириллица) ---
        if not re.match(r'^[а-яА-ЯёЁ\s\-]+$', formatted_real_name):
            return await interaction.response.send_message(
                "❌ **Ошибка:** Имя должно содержать только кириллицу (допускаются пробелы и дефис).",
                ephemeral=True
            )

        await interaction.response.defer(ephemeral=True)

        sid32 = await resolve_steam_id(self.steam.component.value)
        if not sid32:
            return await interaction.followup.send("❌ **Ошибка:** Неверный формат Steam ID.", ephemeral=True)

        # --- 4. ЗАПРОС К OPENDOTA ---
        rank = await fetch_opendota_rank(sid32)

        # --- 5. ЗАПИСЬ В БД ---
        async with async_session() as session:
            try:
                registration = await register_or_reactivate_player(
                    session,
                    discord_id=interaction.user.id,
                    steam_id32=sid32,
                    real_name=formatted_real_name,
                    ingame_name=nickname,
                    positions=positions,
                    rank_tier=rank,
                    avatar_url=str(interaction.user.display_avatar.url),
                )
            except PlayerRegistrationError as error:
                await session.rollback()
                return await interaction.followup.send(
                    f"❌ {error}", ephemeral=True
                )
            await session.commit()
            new_p = registration.player

            action = "reactivated" if registration.was_reactivated else "registered"
            print(
                f"[DB] Player {action}: {nickname} "
                f"(ID: {interaction.user.id})"
            )

            # --- AUTO-UPDATE DISCORD PROFILE ---
            cog = interaction.client.get_cog("Profile")
            if cog:
                await cog.update_discord_profile(interaction.user, new_p)

        # --- 6. ЗАМЕНА РОЛИ НОВИЧКА НА РОЛЬ УЧАСТНИКА ---
        if NEW_USER_ROLE_ID and any(r.id == NEW_USER_ROLE_ID for r in interaction.user.roles):
            try:
                guild = interaction.guild
                new_user_role = guild.get_role(NEW_USER_ROLE_ID)
                participant_role = guild.get_role(LEAGUE_PARTICIPANT_ROLE_ID)
                if new_user_role:
                    await interaction.user.remove_roles(new_user_role)
                if participant_role and participant_role not in interaction.user.roles:
                    await interaction.user.add_roles(participant_role)
                print(f"[ROLE] Роль новичка заменена на участника для {interaction.user.display_name}")
            except discord.Forbidden:
                print(f"[WARN] Нет прав для замены роли у {interaction.user.display_name}")
            except Exception as e:
                print(f"[ERROR] Ошибка замены роли: {e}")

        # --- 7. ЛОГИРОВАНИЕ ---
        await send_log(
            title="🆕 Новая регистрация",
            description=f"Игрок: {interaction.user.mention}\nНик: `{nickname}`\nИмя: `{formatted_real_name}`\nSteam: `{sid32}`",
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
        self.sync_discord_profiles_task.start()
        self.update_ranks_task.start()
        self.sync_discord_avatars_task.start()
        self.bot.add_view(RegistrationView())

    def cog_unload(self):
        self.sync_discord_profiles_task.cancel()
        self.update_ranks_task.cancel()
        self.sync_discord_avatars_task.cancel()

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

            primary_pos = player_data.positions.split('/')[0]
            second_pos = player_data.positions.split('/')[1]
            target_pos_names = []
            if primary_pos:
                name = POSITION_ROLE_NAMES[primary_pos]
                name2 = POSITION_ROLE_NAMES[second_pos]
                if name:
                    target_pos_names.append(name)
                if name2:
                    target_pos_names.append(name2)



            rank_names = {
                1: "Рекрут", 2: "Страж", 3: "Рыцарь", 4: "Герой",
                5: "Легенда", 6: "Властелин", 7: "Божество", 8: "Титан"
            }
            target_rank_name = rank_names.get((player_data.rank_tier // 10) if player_data.rank_tier else 0)

            all_managed_roles = list(rank_names.values()) + list(POSITION_ROLE_NAMES.values())
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

    @tasks.loop(hours=DISCORD_PROFILE_SYNC_INTERVAL_HOURS)
    async def sync_discord_profiles_task(self):
        guild = (
            self.bot.get_guild(GUILD_ID)
            if GUILD_ID
            else next(iter(self.bot.guilds), None)
        )
        if guild is None:
            print("[PROFILES] Discord server is unavailable for synchronization.")
            return

        try:
            async with async_session() as session:
                players = (await session.execute(
                    select(Player).where(Player.is_archived.is_(False))
                )).scalars().all()

            for player in players:
                member = guild.get_member(player.discord_id)
                if member:
                    await self.update_discord_profile(member, player)
                await asyncio.sleep(0.5)

            print(f"[PROFILES] Synchronized {len(players)} player profiles.")
        except Exception as error:
            print(
                "[PROFILES] Hourly synchronization failed; "
                f"the next run will retry: {error}"
            )

    @sync_discord_profiles_task.before_loop
    async def before_profile_sync(self):
        await self.bot.wait_until_ready()

    # --- COMMANDS ---

    @app_commands.command(name="setup_registration", description="[Admin] Разместить кнопку регистрации")
    @app_commands.checks.has_permissions(administrator=True)
    async def setup_reg(self, interaction: discord.Interaction):
        await interaction.response.send_message("Создаю чистую кнопку...", ephemeral=True)

        webhook = await interaction.channel.create_webhook(name="League Registration")

        await webhook.send(
            content="# 🏆 Регистрация на сервере Linken's Sphere Esports\nНажмите кнопку ниже, чтобы заполнить анкету и получить доступ к каналам.",
            view=RegistrationView(),
            username=self.bot.user.name,
            avatar_url=self.bot.user.display_avatar.url
        )
        await webhook.delete()

    @app_commands.command(name="admin_delete_player", description="[Admin] Удалить игрока")
    @app_commands.checks.has_permissions(administrator=True)
    async def admin_delete_player(self, interaction: discord.Interaction, member: discord.Member):
        await interaction.response.defer(ephemeral=True)
        report = []
        db_msg = "Неизвестно"

        print(f"\n🚀 [START DELETE] Юзер: {member.display_name} (ID: {member.id})")

        # 1. DB DELETE
        try:
            async with async_session() as session:
                print(f"🔎 [DB] Поиск игрока {member.id}...")
                player = await session.get(Player, member.id)
                if player:
                    print(f"🗑️ [DB] Игрок найден. Удаляю...")
                    await session.delete(player)
                    await session.commit()
                    db_msg = "✅ Удален из базы."
                else:
                    print(f"❓ [DB] Игрок не найден в таблице.")
                    db_msg = "⚠️ Не был в базе."
        except Exception as e:
            print(f"❌ [DB ERROR] {e}")
            db_msg = f"❌ Ошибка БД: {e}"

        # 2. DISCORD CLEANUP
        try:
            # Пытаемся получить свежий объект мембера
            try:
                member = await interaction.guild.fetch_member(member.id)
                print(f"👤 [DISCORD] Данные мембера получены. Ролей: {len(member.roles)}")
            except Exception as e:
                print(f"⚠️ [DISCORD] Не удалось сделать fetch_member: {e}")

            # Сброс ника
            if member.nick:
                try:
                    await member.edit(nick=None)
                    report.append("Ник сброшен")
                except discord.Forbidden:
                    report.append("🚫 Нет прав на ник")

            # Работа с ролями
            target_names = ["Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal"]
            to_remove = [r for r in member.roles if r.name in target_names]

            print(f"🎭 [ROLES] Найдено ролей для удаления: {[r.name for r in to_remove]}")

            if to_remove:
                try:
                    await member.remove_roles(*to_remove)
                    report.append(f"Роли сняты: {len(to_remove)}")
                except discord.Forbidden:
                    print("🚫 [ERROR] 403 Forbidden: Роль бота ниже рангов!")
                    report.append("⛔ Ошибка иерархии ролей")
                except Exception as e:
                    print(f"❌ [ROLES ERROR] {e}")
                    report.append(f"Ошибка ролей: {e}")
            else:
                report.append("Роли не найдены")

        except Exception as e:
            print(f"💥 [CRITICAL ERROR] {e}")
            report.append(f"Критический сбой: {e}")

        print(f"🏁 [FINISH DELETE] Операция завершена.\n")

        await interaction.followup.send(f"🗑️ **Итог:**\n1. {db_msg}\n2. {', '.join(report)}")

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

            await session.commit()

            # --- SYNC CHANGES ---
            await self.update_discord_profile(member, player)

        await send_log(
            title="🛠️ Профиль изменен (Админ)",
            description=f"**Кто изменил:** {interaction.user.mention}\n**Кого:** {member.mention}\n\n" + "\n".join(changes),
            color=discord.Color.orange()
        )
        await interaction.followup.send(f"✅ Данные {member.mention} обновлены.")

    @app_commands.command(name="admin_recheck_rank",
                          description="[Admin] Перезапросить ранг игрока через OpenDota")
    @app_commands.checks.has_permissions(administrator=True)
    async def admin_recheck_rank(self, interaction: discord.Interaction, member: discord.Member):
        await interaction.response.defer(ephemeral=True)
        async with async_session() as session:
            player = await session.get(Player, member.id)
            if not player:
                return await interaction.followup.send("❌ Игрок не зарегистрирован.")
            old = player.rank_tier or 0
            new_rank = await fetch_opendota_rank(player.steam_id32)
            player.rank_tier = new_rank
            await session.commit()
            await self.update_discord_profile(member, player)

        await send_log(
            title="🔄 Перезапрос ранга",
            description=(f"**Админ:** {interaction.user.mention}\n"
                         f"**Игрок:** {member.mention}\n"
                         f"**Было:** `{old}` → **Стало:** `{new_rank}`"),
            color=discord.Color.blurple(),
        )
        suffix = "" if new_rank else " ⚠️ OpenDota по-прежнему не вернул ранг — используй `/admin_set_rank`."
        await interaction.followup.send(
            f"✅ Перепроверка завершена. `rank_tier`: {old} → {new_rank}.{suffix}"
        )

    @app_commands.command(name="admin_set_rank",
                          description="[Admin] Установить ранг игрока вручную")
    @app_commands.checks.has_permissions(administrator=True)
    async def admin_set_rank(self, interaction: discord.Interaction, member: discord.Member):
        async with async_session() as session:
            player = await session.get(Player, member.id)
        if not player:
            return await interaction.response.send_message(
                "❌ Игрок не зарегистрирован.", ephemeral=True)
        view = SetRankView(self, member)
        await interaction.response.send_message(
            f"Выбери ранг для {member.mention}:", view=view, ephemeral=True)


    @app_commands.command(name="player_info", description="Показать профиль игрока и тир")
    async def player_info(self, interaction: discord.Interaction, member: discord.Member = None):
        await interaction.response.defer()
        target = member or interaction.user

        async with self.bot.session_maker() as session:  # Используй self.bot.session_maker или async_session() как у тебя настроено
            player = (await session.execute(
                select(Player).where(
                    Player.discord_id == target.id,
                    Player.is_archived.is_(False),
                )
            )).scalar_one_or_none()

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

    @tasks.loop(minutes=5)
    async def sync_discord_avatars_task(self):
        """Keep registered player avatars aligned with their Discord profiles."""
        try:
            guilds = (
                [self.bot.get_guild(GUILD_ID)]
                if GUILD_ID
                else list(self.bot.guilds)
            )
            members_by_id: dict[int, discord.Member] = {}
            for guild in guilds:
                if guild is None:
                    continue
                if not guild.chunked:
                    try:
                        await guild.chunk(cache=True)
                    except Exception as error:
                        print(
                            f"[AVATARS] Could not refresh member cache "
                            f"for guild {guild.id}: {error}"
                        )
                for member in guild.members:
                    members_by_id.setdefault(member.id, member)

            if not members_by_id:
                print("[AVATARS] No Discord members available for synchronization.")
                return

            async with async_session() as session:
                players = (await session.execute(
                    select(Player).where(Player.is_archived.is_(False))
                )).scalars().all()
                updates = collect_discord_avatar_updates(
                    players,
                    members_by_id.values(),
                )
                if not updates:
                    return
                for player in players:
                    avatar_url = updates.get(int(player.discord_id))
                    if avatar_url:
                        player.avatar_url = avatar_url
                await session.commit()
                print(
                    f"[AVATARS] Updated Discord avatars: "
                    f"{len(updates)}/{len(players)}"
                )
        except Exception as error:
            print(f"[AVATARS] Synchronization failed: {error}")

    @sync_discord_avatars_task.before_loop
    async def before_avatar_sync(self):
        await self.bot.wait_until_ready()

    @tasks.loop(hours=24)
    async def update_ranks_task(self):
        print("[TASKS] Starting mass rank update...")

        async with async_session() as session:
            players = (await session.execute(
                select(Player).where(Player.is_archived.is_(False))
            )).scalars().all()
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

        print("[TASKS] Rank update completed successfully.")

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
            label="Новый тир (0-12)",
            placeholder="0 = сброс ручного тира",
            min_length=1,
            max_length=2,
            required=True
        )
        self.add_item(self.tier_input)

    async def on_submit(self, interaction: discord.Interaction):
        try:
            val = int(self.tier_input.value)
            if not 0 <= val <= 12:
                raise ValueError
        except ValueError:
            return await interaction.response.send_message("❌ Ошибка: введите число от 0 до 12.", ephemeral=True)

        # Сохранение в БД
        async with self.bot.session_maker() as session:
            stmt = select(Player).where(
                Player.discord_id == self.player_id,
                Player.is_archived.is_(False),
            )
            result = await session.execute(stmt)
            player = result.scalar_one_or_none()

            if player:
                set_player_tier(player, val)
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


class SetRankView(discord.ui.View):
    def __init__(self, cog, member):
        super().__init__(timeout=180)
        self.cog = cog
        self.member = member
        self.bracket: int | None = None
        self.star_select: discord.ui.Select | None = None
        self.add_item(self._make_bracket_select())

    def _make_bracket_select(self):
        sel = discord.ui.Select(
            placeholder="1) Выбери бракет",
            options=[discord.SelectOption(label=lbl, value=str(v))
                     for lbl, v in RANK_BRACKETS_RU],
        )

        async def cb(i: discord.Interaction):
            self.bracket = int(sel.values[0])
            if self.bracket == 8:
                await self._save(i, rank_tier=80)
                return
            if self.star_select:
                self.remove_item(self.star_select)
            self.star_select = self._make_star_select()
            self.add_item(self.star_select)
            await i.response.edit_message(view=self)

        sel.callback = cb
        return sel

    def _make_star_select(self):
        sel = discord.ui.Select(
            placeholder="2) Выбери звезду (1–5)",
            options=[discord.SelectOption(label=str(s), value=str(s)) for s in range(1, 6)],
        )

        async def cb(i: discord.Interaction):
            star = int(sel.values[0])
            await self._save(i, rank_tier=self.bracket * 10 + star)

        sel.callback = cb
        return sel

    async def _save(self, interaction: discord.Interaction, rank_tier: int):
        async with async_session() as session:
            p = await session.get(Player, self.member.id)
            old = p.rank_tier or 0
            p.rank_tier = rank_tier
            await session.commit()
            await self.cog.update_discord_profile(self.member, p)
        await send_log(
            title="🛠️ Ранг установлен вручную",
            description=(f"**Админ:** {interaction.user.mention}\n"
                         f"**Игрок:** {self.member.mention}\n"
                         f"**Было:** `{old}` → **Стало:** `{rank_tier}`"),
            color=discord.Color.orange(),
        )
        for child in self.children:
            child.disabled = True
        await interaction.response.edit_message(
            content=f"✅ Установлен `rank_tier={rank_tier}` для {self.member.mention}.",
            view=self,
        )
        self.stop()


# Вспомогательная функция для создания красивого Embed (чтобы не дублировать код)
def create_player_embed(player, discord_member):
    rank_names = {1: "Herald", 2: "Guardian", 3: "Crusader", 4: "Archon", 5: "Legend", 6: "Ancient",
                  7: "Divine", 8: "Immortal"}
    rank_label = rank_names.get((player.rank_tier // 10) if player.rank_tier else 0, "Uncalibrated")

    # --- ЛОГИКА ТИРА ---
    if player.internal_rating and player.internal_rating > 0:
        tier_str = f"🛠️ **{player.internal_rating}** (Manual)"
    else:
        tier_str = f"🤖 {effective_player_tier(player)} (Auto)"
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
