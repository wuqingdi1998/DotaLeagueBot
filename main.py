import os
import asyncio
import discord
from discord.ext import commands
from dotenv import load_dotenv

# 👇 ИМПОРТИРУЕМ И ФУНКЦИЮ, И ПЕРЕМЕННУЮ СЕССИИ
from database.core import init_db, async_session

from cogs.ui.profile_menu import ProfileManageView
from services.sheet_service import SheetService

load_dotenv()
GUILD_ID = os.getenv("GUILD_ID")
SHEET_URL = os.getenv("SHEET_URL")


class LeagueBot(commands.Bot):
    def __init__(self):
        # 1. Настраиваем интенты
        intents = discord.Intents.default()
        intents.members = True
        intents.message_content = True

        # 2. Инициализируем родительский класс
        super().__init__(
            command_prefix=commands.when_mentioned,
            intents=intents,
            help_command=None
        )

        # 3. Заготовки для атрибутов
        self.session_maker = None  # Сначала None
        self.sheet_service = None
        self.sheet_url = SHEET_URL

    async def setup_hook(self):
        print("🔄 Запуск setup_hook...")

        # --- А. Подключение к БД ---
        try:
            # 1. Создаем таблицы (если их нет)
            await init_db()

            # 2. 👇 ПРИСВАИВАЕМ ПЕРЕМЕННУЮ async_session ИЗ database.core
            self.session_maker = async_session

            print("✅ База данных подключена и session_maker привязан.")
        except Exception as e:
            print(f"❌ Ошибка БД: {e}")

        # --- Б. Загрузка Когов ---
        for filename in os.listdir("./cogs"):
            if filename.endswith(".py") and filename != "__init__.py":
                try:
                    await self.load_extension(f"cogs.{filename[:-3]}")
                    print(f"🧩 Загружен ког: {filename}")
                except Exception as e:
                    print(f"❌ Не удалось загрузить {filename}: {e}")

        # --- В. Регистрация Кнопок ---
        self.add_view(ProfileManageView())
        print("✅ Persistent Views (Кнопки профиля) зарегистрированы.")

        # --- Г. Синхронизация команд ---
        if GUILD_ID:
            guild_object = discord.Object(id=int(GUILD_ID))
            self.tree.copy_global_to(guild=guild_object)
            await self.tree.sync(guild=guild_object)
            print("🌲 Команды синхронизированы с гильдией.")
        else:
            await self.tree.sync()
            print("🌲 Глобальная синхронизация команд.")


async def main():
    bot = LeagueBot()
    token = os.getenv("DISCORD_TOKEN")
    async with bot:
        await bot.start(token)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass