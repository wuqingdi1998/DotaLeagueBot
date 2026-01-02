import discord
from discord.ext import commands
from discord import app_commands
import aiohttp
import re
from sqlalchemy import select

# --- Project Imports ---
from utils.steam_tools import extract_steam_id32
from database.core import async_session
from database.models import Player

RANK_NAMES = {
    1: "Herald", 2: "Guardian", 3: "Crusader", 4: "Archon",
    5: "Legend", 6: "Ancient", 7: "Divine", 8: "Immortal"
}


class Profile(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="register", description="Регистрация в лиге: Имя, Позиции и Steam")
    @app_commands.describe(
        steam_input="Steam ID или ссылка на профиль",
        real_name="Твое имя (например: Иван)",
        positions="Две основные позиции (например: 1/2 или 4/5)"
    )
    async def register(self, interaction: discord.Interaction, steam_input: str, real_name: str, positions: str):
        await interaction.response.defer(ephemeral=True)

        # Check for repeat the registration
        async with async_session() as session:
            stmt = select(Player).where(Player.discord_id == interaction.user.id)
            existing_player = (await session.execute(stmt)).scalar_one_or_none()

            if existing_player:
                return await interaction.followup.send(
                    "❌ **Ошибка:** Вы уже зарегистрированы в системе.\n"
                    "Для изменения данных (имени, позиций или Steam) обратитесь к администратору лиги.",
                    ephemeral=True
                )

        # 1. Validate Positions Format
        if not re.match(r"^[1-5]/[1-5]$", positions):
            return await interaction.followup.send(
                "❌ **Ошибка:** Укажите позиции в формате `1/2` (две цифры через дробь).")

        # 2. Extract Steam ID
        steam_id32 = extract_steam_id32(steam_input)
        if not steam_id32:
            return await interaction.followup.send("❌ **Ошибка:** Неверный формат Steam ID.")

        # 3. Get Data from OpenDota
        url = f"https://api.opendota.com/api/players/{steam_id32}"
        async with aiohttp.ClientSession() as http_session:
            async with http_session.get(url) as response:
                if response.status != 200:
                    return await interaction.followup.send(f"❌ Ошибка API OpenDota: {response.status}")
                data = await response.json()

        if 'profile' not in data:
            return await interaction.followup.send(
                "⚠️ Профиль скрыт или не найден. Проверьте настройки приватности в Dota 2.")

        persona_name = data['profile']['personaname']
        avatar_url = data['profile']['avatarfull']
        rank_tier = data.get('rank_tier', 0)

        # 4. Database Transaction
        async with async_session() as session:
            # Check if this Discord user already exists
            stmt = select(Player).where(Player.discord_id == interaction.user.id)
            result = await session.execute(stmt)
            player = result.scalar_one_or_none()

            if player:
                # Update existing player
                player.steam_id32 = steam_id32
                player.personaname = persona_name
                player.real_name = real_name
                player.positions = positions
                player.avatar_url = avatar_url
                player.rank_tier = rank_tier
                action = "Updated"
            else:
                # Create new player
                player = Player(
                    discord_id=interaction.user.id,
                    steam_id32=steam_id32,
                    personaname=persona_name,
                    real_name=real_name,
                    positions=positions,
                    avatar_url=avatar_url,
                    rank_tier=rank_tier
                )
                session.add(player)
                action = "Created"

            try:
                await session.commit()
                print(f"[DB] Player {action}: {real_name} ({persona_name})")
            except Exception as e:
                await session.rollback()
                print(f"[ERROR] DB Fail: {e}")
                return await interaction.followup.send("❌ Ошибка при сохранении в базу данных.")

        # 5. Success Response
        rank_name = RANK_NAMES.get(rank_tier // 10, "Uncalibrated") if rank_tier else "Uncalibrated"

        embed = discord.Embed(title="✅ Регистрация завершена", color=discord.Color.green())
        embed.set_thumbnail(url=avatar_url)
        embed.add_field(name="Имя (Ник)", value=f"{real_name} ({persona_name})", inline=True)
        embed.add_field(name="Позиции", value=f"`{positions}`", inline=True)
        embed.add_field(name="Ранг", value=rank_name, inline=True)

        await interaction.followup.send(embed=embed)

    @app_commands.command(name="admin_edit_player", description="[Admin] Изменить данные игрока (Имя, Роли, Steam)")
    @app_commands.describe(
        member="Игрок, чьи данные нужно изменить",
        new_name="Новое имя",
        new_positions="Новые позиции (1/2)",
        new_steam_input="Новый Steam ID или ссылка"
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def admin_edit_player(self, interaction: discord.Interaction, member: discord.Member,
                                new_name: str = None,
                                new_positions: str = None,
                                new_steam_input: str = None):
        """Allows admins to manually update player details, including Steam account."""
        await interaction.response.defer(ephemeral=True)

        async with async_session() as session:
            stmt = select(Player).where(Player.discord_id == member.id)
            player = (await session.execute(stmt)).scalar_one_or_none()

            if not player:
                return await interaction.followup.send(f"❌ Игрок {member.mention} не найден в базе.")

            # 1. Update Real Name
            if new_name:
                player.real_name = new_name

            # 2. Update Positions
            if new_positions:
                if not re.match(r"^[1-5]/[1-5]$", new_positions):
                    return await interaction.followup.send("❌ Неверный формат позиций. Нужно `1/2`.")
                player.positions = new_positions

            # 3. Update Steam Account (Deep Update)
            if new_steam_input:
                new_steam_id32 = extract_steam_id32(new_steam_input)
                if not new_steam_id32:
                    return await interaction.followup.send("❌ Неверный формат нового Steam ID.")

                # Fetch new data from OpenDota for the new account
                url = f"https://api.opendota.com/api/players/{new_steam_id32}"
                async with aiohttp.ClientSession() as http_session:
                    async with http_session.get(url) as response:
                        if response.status == 200:
                            data = await response.json()
                            if 'profile' in data:
                                player.steam_id32 = new_steam_id32
                                player.personaname = data['profile']['personaname']
                                player.avatar_url = data['profile']['avatarfull']
                                player.rank_tier = data.get('rank_tier', 0)
                            else:
                                return await interaction.followup.send(
                                    "⚠️ Новый Steam профиль скрыт. Данные не обновлены.")

            await session.commit()
            print(f"[DB] Admin manually updated player: {member.id}")

        await interaction.followup.send(f"✅ Данные {member.mention} успешно изменены администратором.")


async def setup(bot):
    await bot.add_cog(Profile(bot))