import discord
from discord.ext import commands
from discord import app_commands
from sqlalchemy import select, delete, func

# --- Project Imports ---
from database.core import async_session
from database.models import Player, Team
from services.team_service import TeamService


class Teams(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    # 1. CREATE TEAM
    @app_commands.command(name="team_create", description="[Admin] Создать пустую команду")
    @app_commands.checks.has_permissions(administrator=True)
    async def team_create(self, interaction: discord.Interaction, name: str):
        await interaction.response.defer(ephemeral=True)

        async with async_session() as session:
            # Проверка дубликата
            stmt = select(Team).where(Team.name == name)
            if (await session.execute(stmt)).scalar_one_or_none():
                return await interaction.followup.send(f"❌ Команда **{name}** уже существует.")

            # --- Создание в Discord ---
            ts = TeamService(interaction.guild)
            try:
                # Создаем роль и канал
                env = await ts.create_team_environment(team_name=name, captain=None)
                role = env['role']
                channel = env['channel']
            except Exception as e:
                return await interaction.followup.send(f"❌ Ошибка при создании в Discord: {e}")

            # --- Сохранение в БД ---
            # ВАЖНО: Мы сохраняем role_id и channel_id!
            new_team = Team(name=name, role_id=role.id, channel_id=channel.id)
            session.add(new_team)
            await session.commit()

            print(f"[DB] Team created: {name} (ID: {new_team.id})")

        await interaction.followup.send(
            f"✅ Команда **{name}** создана.\nID: `{new_team.id}`\nРоль: {role.mention}\nКанал: {channel.mention}")

    # 2. DELETE TEAM BY ID
    @app_commands.command(name="team_delete", description="[Admin] Удалить команду по ID")
    @app_commands.checks.has_permissions(administrator=True)
    async def team_delete(self, interaction: discord.Interaction, team_id: int):
        await interaction.response.defer(ephemeral=True)

        async with async_session() as session:
            team = await session.get(Team, team_id)
            if not team:
                return await interaction.followup.send(f"❌ Команда с ID `{team_id}` не найдена.")

            # --- Удаление в Discord ---
            # Удаляем роль и канал перед удалением из БД
            ts = TeamService(interaction.guild)
            await ts.delete_team_environment(team.role_id, team.channel_id)

            # Очистка игроков (снимаем team_id)
            players_stmt = select(Player).where(Player.team_id == team.id)
            players_res = await session.execute(players_stmt)
            for p in players_res.scalars():
                p.team_id = None

            # Удаление из БД
            await session.delete(team)
            await session.commit()

            print(f"[DB] Team ID {team_id} deleted.")

        await interaction.followup.send(f"🗑️ Команда `{team.name}` (ID: {team_id}) удалена, каналы очищены.")

    # 3. LIST TEAMS
    @app_commands.command(name="teams_list", description="Список всех команд")
    async def teams_list(self, interaction: discord.Interaction):
        await interaction.response.defer()
        async with async_session() as session:
            teams = (await session.execute(select(Team))).scalars().all()
            if not teams:
                return await interaction.followup.send("ℹ️ Команд пока нет.")

            embed = discord.Embed(title="🛡️ Команды лиги", color=discord.Color.blue())
            for t in teams:
                # Считаем игроков
                p_count = (
                    await session.execute(select(func.count(Player.discord_id)).where(Player.team_id == t.id))).scalar()

                # Формируем строку (добавил упоминание роли для красоты)
                role_mention = f"<@&{t.role_id}>" if t.role_id else "Без роли"
                val_str = f"Игроков: {p_count} | Роль: {role_mention}"

                embed.add_field(name=f"ID: {t.id} | {t.name}", value=val_str, inline=False)

            await interaction.followup.send(embed=embed)

    # 4. TEAM INFO BY ID
    @app_commands.command(name="team_info", description="Информация о команде по ID")
    async def team_info(self, interaction: discord.Interaction, team_id: int):
        await interaction.response.defer()
        async with async_session() as session:
            team = await session.get(Team, team_id)
            if not team:
                return await interaction.followup.send(f"❌ Команда ID `{team_id}` не найдена.")

            stmt = select(Player).where(Player.team_id == team.id)
            players = (await session.execute(stmt)).scalars().all()

            embed = discord.Embed(title=f"🛡️ Состав: {team.name} (ID: {team.id})", color=discord.Color.green())

            # Добавляем ссылку на чат команды
            if team.channel_id:
                embed.description = f"Чат: <#{team.channel_id}>"

            if not players:
                roster = "*В команде пока нет участников*"
            else:
                lines = []
                for i, p in enumerate(players):
                    # Пытаемся найти пользователя в дискорде для красивого упоминания
                    member = interaction.guild.get_member(p.discord_id)
                    name_display = member.mention if member else p.real_name

                    lines.append(f"{i + 1}. {name_display} ({p.ingame_name}) `[{p.positions or '?'}]`")

                roster = "\n".join(lines)

            embed.add_field(name="Участники", value=roster)
            await interaction.followup.send(embed=embed)

    # 5. ADD PLAYER BY TEAM ID
    @app_commands.command(name="team_add_player", description="[Admin] Добавить игрока в команду по ID")
    @app_commands.checks.has_permissions(administrator=True)
    async def team_add_player(self, interaction: discord.Interaction, team_id: int, member: discord.Member):
        await interaction.response.defer(ephemeral=True)

        async with async_session() as session:
            team = await session.get(Team, team_id)
            player = await session.get(Player, member.id)

            if not team: return await interaction.followup.send(f"❌ Команда ID `{team_id}` не найдена.")
            if not player: return await interaction.followup.send(f"❌ {member.mention} не зарегистрирован!")

            # Обновляем БД
            player.team_id = team.id
            await session.commit()

            # --- ВЫДАЕМ РОЛЬ ---
            if team.role_id:
                role = interaction.guild.get_role(team.role_id)
                if role:
                    try:
                        await member.add_roles(role)
                    except discord.Forbidden:
                        await interaction.followup.send(f"⚠️ Игрок добавлен в БД, но я не могу выдать роль (нет прав).")
            # -------------------

        await interaction.followup.send(f"✅ {member.mention} добавлен в **{team.name}** и получил роль.")

    # 6. KICK PLAYER
    @app_commands.command(name="team_kick_player", description="[Admin] Исключить игрока из команды")
    @app_commands.checks.has_permissions(administrator=True)
    async def team_kick_player(self, interaction: discord.Interaction, member: discord.Member):
        await interaction.response.defer(ephemeral=True)

        async with async_session() as session:
            player = await session.get(Player, member.id)
            if not player or not player.team_id:
                return await interaction.followup.send(f"❌ Игрок не в команде.")

            # Запоминаем ID команды перед удалением, чтобы найти роль
            old_team_id = player.team_id
            team = await session.get(Team, old_team_id)

            # Обновляем БД
            player.team_id = None
            await session.commit()

            # --- ЗАБИРАЕМ РОЛЬ ---
            if team and team.role_id:
                role = interaction.guild.get_role(team.role_id)
                # Проверяем, есть ли роль у игрока
                if role and role in member.roles:
                    try:
                        await member.remove_roles(role)
                    except discord.Forbidden:
                        pass  # Не критично
            # ---------------------

        await interaction.followup.send(f"👢 {member.mention} исключен и лишен роли.")

    # Error Handler
    @team_create.error
    @team_delete.error
    @team_add_player.error
    @team_kick_player.error
    async def admin_error_handler(self, interaction: discord.Interaction, error: app_commands.AppCommandError):
        if isinstance(error, app_commands.MissingPermissions):
            await interaction.response.send_message("⛔ Нет прав администратора.", ephemeral=True)
        else:
            print(f"ERROR: {error}")  # Полезно для дебага


async def setup(bot):
    await bot.add_cog(Teams(bot))