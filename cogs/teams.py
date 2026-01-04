import discord
from discord.ext import commands
from discord import app_commands
from sqlalchemy import select, delete, func

# --- Project Imports ---
from database.core import async_session
from database.models import Player, Team


class Teams(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    # 1. CREATE TEAM
    @app_commands.command(name="team_create", description="[Admin] Создать пустую команду")
    @app_commands.checks.has_permissions(administrator=True)
    async def team_create(self, interaction: discord.Interaction, name: str):
        await interaction.response.defer(ephemeral=True)
        async with async_session() as session:
            stmt = select(Team).where(Team.name == name)
            if (await session.execute(stmt)).scalar_one_or_none():
                return await interaction.followup.send(f"❌ Команда **{name}** уже существует.")

            new_team = Team(name=name)
            session.add(new_team)
            await session.commit()
            print(f"[DB] Team created: {name} (ID: {new_team.id})")
        await interaction.followup.send(f"✅ Команда **{name}** создана. ID: `{new_team.id}`")

    # 2. DELETE TEAM BY ID
    @app_commands.command(name="team_delete", description="[Admin] Удалить команду по ID")
    @app_commands.checks.has_permissions(administrator=True)
    async def team_delete(self, interaction: discord.Interaction, team_id: int):
        await interaction.response.defer(ephemeral=True)
        async with async_session() as session:
            team = await session.get(Team, team_id)
            if not team:
                return await interaction.followup.send(f"❌ Команда с ID `{team_id}` не найдена.")

            # Cleanup players
            players_stmt = select(Player).where(Player.team_id == team.id)
            players_res = await session.execute(players_stmt)
            for p in players_res.scalars():
                p.team_id = None

            await session.delete(team)
            await session.commit()
            print(f"[DB] Team ID {team_id} deleted.")
        await interaction.followup.send(f"🗑️ Команда `{team.name}` (ID: {team_id}) удалена.")

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
                p_count = (
                    await session.execute(select(func.count(Player.discord_id)).where(Player.team_id == t.id))).scalar()
                embed.add_field(name=f"ID: {t.id} | {t.name}", value=f"Игроков: {p_count}", inline=False)
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

            if not players:
                roster = "*В команде пока нет участников*"
            else:
                lines = []
                roster = ""
                for i, p in enumerate(players):
                    r_name = p.real_name or "Без имени"
                    s_nick = p.ingame_name or "NoNick"
                    pos = p.positions or "?/?"
                    roster += f"{i + 1}. **{p.real_name}** ({p.ingame_name}) `[{p.positions}]` \n"
                    line = f"{i + 1}. **{r_name}** ({s_nick}) `[{pos}]`"
                    lines.append(line)

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

            player.team_id = team.id
            await session.commit()
        await interaction.followup.send(f"✅ {member.mention} добавлен в **{team.name}** (ID: {team_id}).")

    # 6. KICK PLAYER
    @app_commands.command(name="team_kick_player", description="[Admin] Исключить игрока из команды")
    @app_commands.checks.has_permissions(administrator=True)
    async def team_kick_player(self, interaction: discord.Interaction, member: discord.Member):
        await interaction.response.defer(ephemeral=True)
        async with async_session() as session:
            player = await session.get(Player, member.id)
            if not player or not player.team_id:
                return await interaction.followup.send(f"❌ Игрок не в команде.")

            player.team_id = None
            await session.commit()
        await interaction.followup.send(f"👢 {member.mention} исключен.")

    # Error Handler
    @team_create.error
    @team_delete.error
    @team_add_player.error
    @team_kick_player.error
    async def admin_error_handler(self, interaction: discord.Interaction, error: app_commands.AppCommandError):
        if isinstance(error, app_commands.MissingPermissions):
            await interaction.response.send_message("⛔ Нет прав администратора.", ephemeral=True)


async def setup(bot):
    await bot.add_cog(Teams(bot))