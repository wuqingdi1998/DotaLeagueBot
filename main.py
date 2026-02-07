import discord
from discord.ext import commands
import os
import asyncio

from dotenv import load_dotenv

# Импортируем алхимию
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from database.core import init_db
from services.sheet_service import SheetService

load_dotenv()
GUILD_ID = os.getenv("GUILD_ID")
SHEET_URL = os.getenv("SHEET_URL")

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
        self.session_maker = None  # Заготовка для БД
        self.sheet_service = None  # Заготовка для Google Sheets
        self.sheet_url = None      # Заготовка для ссылки

    async def setup_hook(self):
        print("--- Initializing Services ---")

        # --- 1. ПОДКЛЮЧЕНИЕ GOOGLE SHEETS ---
        # Делаем это здесь, внутри класса
        try:
            self.sheet_service = SheetService("credentials.json", SHEET_URL)
            self.sheet_url = SHEET_URL
            print("✅ [Google Sheets] Успешно подключено!")
        except Exception as e:
            print(f"❌ [Google Sheets] Ошибка подключения: {e}")
            # Бот продолжит работать, но без таблиц

        # --- 2. ПОДКЛЮЧЕНИЕ БАЗЫ ДАННЫХ ---
        user = os.getenv("POSTGRES_USER")
        password = os.getenv("POSTGRES_PASSWORD")
        db_name = os.getenv("POSTGRES_DB")
        host = os.getenv("POSTGRES_HOST", "dota_postgres") # dota_postgres для докера, localhost для тестов

        # Склеиваем строку подключения
        database_url = f"postgresql+asyncpg://{user}:{password}@{host}/{db_name}"

        # Создаем движок
        engine = create_async_engine(database_url, echo=False)
        self.session_maker = async_sessionmaker(engine, expire_on_commit=False)

        # Создаем таблицы (если их нет)
        await init_db()
        print("✅ [Database] База данных подключена.")

        # --- 3. ЗАГРУЗКА КОГОВ (Cogs) ---
        print("--- Loading Extensions ---")
        for filename in os.listdir('./cogs'):
            if filename.endswith('.py'):
                try:
                    await self.load_extension(f'cogs.{filename[:-3]}')
                    print(f'[OK] Loaded extension: {filename}')
                except Exception as e:
                    print(f'[ERROR] Failed to load {filename}: {e}')

        # --- 4. СИНХРОНИЗАЦИЯ КОМАНД ---
        print("--- Syncing Commands ---")
        try:
            # Если GUILD_ID указан, синхронизируем моментально для этого сервера (для разработки)
            if GUILD_ID:
                guild_obj = discord.Object(id=GUILD_ID)
                self.tree.copy_global_to(guild=guild_obj)
                synced = await self.tree.sync(guild=guild_obj)
                print(f'[OK] Synced {len(synced)} command(s) to Guild {GUILD_ID}.')
            else:
                # Глобальная синхронизация (может занимать до часа)
                await self.tree.sync()
                print('[OK] Global commands synced.')
        except Exception as e:
            print(f'[ERROR] Command sync failed: {e}')

    async def on_ready(self):
        print(f'------------------------------------')
        print(f'Logged in as: {self.user.name}')
        print(f'Bot ID: {self.user.id}')
        if self.sheet_service:
            print(f'Sheets Status: Connected')
        else:
            print(f'Sheets Status: ERROR')
        print(f'------------------------------------')


if __name__ == '__main__':
    token = os.getenv('DISCORD_TOKEN')
    if token:
        # Создаем экземпляр нашего класса
        bot = LeagueBot()
        # Запускаем
        bot.run(token)
    else:
        print("[CRITICAL] Token not found in .env file!")