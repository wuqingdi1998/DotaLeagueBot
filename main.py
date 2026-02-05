import discord
from discord.ext import commands
import os
from dotenv import load_dotenv

# Импортируем алхимию
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from database.core import init_db

load_dotenv()
GUILD_ID = os.getenv("GUILD_ID")


class LeagueBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.members = True
        intents.message_content = True

        super().__init__(
            command_prefix=commands.when_mentioned,
            intents=intents,
            help_command=None
        )
        self.session_maker = None  # Заготовка

    async def setup_hook(self):
        print("--- Initializing Database ---")

        # 1. СОБИРАЕМ URL ИЗ ТВОИХ ПЕРЕМЕННЫХ
        # Подставь сюда названия переменных, как они у тебя в .env файле
        user = os.getenv("POSTGRES_USER")
        password = os.getenv("POSTGRES_PASSWORD")
        db_name = os.getenv("POSTGRES_DB")
        # В Docker host обычно равен имени сервиса базы в docker-compose (например, "dota_postgres" или "db")
        # Если запускаешь локально (не в докере), то "localhost"
        host = os.getenv("POSTGRES_HOST", "dota_postgres")

        # Склеиваем строку подключения
        database_url = f"postgresql+asyncpg://{user}:{password}@{host}/{db_name}"

        # 2. Создаем движок и фабрику сессий
        # echo=True будет показывать SQL запросы в консоли (удобно для отладки)
        engine = create_async_engine(database_url, echo=False)
        self.session_maker = async_sessionmaker(engine, expire_on_commit=False)

        # 3. Запускаем создание таблиц (твой старый код)
        await init_db()

        # 4. Load Cogs
        print("--- Loading Extensions ---")
        for filename in os.listdir('./cogs'):
            if filename.endswith('.py'):
                try:
                    await self.load_extension(f'cogs.{filename[:-3]}')
                    print(f'[OK] Loaded extension: {filename}')
                except Exception as e:
                    print(f'[ERROR] Failed to load {filename}: {e}')

        # 5. Sync Commands
        print("--- Syncing Commands ---")
        try:
            guild_obj = discord.Object(id=GUILD_ID)
            self.tree.copy_global_to(guild=guild_obj)
            synced = await self.tree.sync(guild=guild_obj)
            print(f'[OK] Synced {len(synced)} command(s) to Guild {GUILD_ID}.')
        except Exception as e:
            print(f'[ERROR] Command sync failed: {e}')

    async def on_ready(self):
        print(f'------------------------------------')
        print(f'Logged in as: {self.user.name}')
        print(f'Bot ID: {self.user.id}')
        print(f'------------------------------------')


if __name__ == '__main__':
    token = os.getenv('DISCORD_TOKEN')
    if token:
        bot = LeagueBot()
        bot.run(token)
    else:
        print("[CRITICAL] Token not found in .env file!")