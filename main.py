import os
import asyncio
import discord
from discord.ext import commands
from dotenv import load_dotenv

# 👇 ИМПОРТИРУЕМ БАЗУ И СЕРВИСЫ
from database.core import init_db, async_session
from cogs.ui.profile_menu import ProfileManageView
from services.sheet_service import SheetService

# Загружаем переменные из .env
load_dotenv()
GUILD_ID = os.getenv("GUILD_ID")
SHEET_URL = os.getenv("SHEET_URL")
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")


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
        self.session_maker = None
        self.sheet_service = None
        self.sheet_url = SHEET_URL

    async def setup_hook(self):
        print("🔄 Запуск setup_hook...")

        # --- 1. Подключение к БД ---
        try:
            await init_db()
            self.session_maker = async_session
            print("✅ База данных подключена.")
        except Exception as e:
            print(f"❌ Ошибка БД: {e}")

        # --- 2. Подключение Google Sheets ---
        try:
            if not SHEET_URL:
                print("⚠️ Внимание: SHEET_URL не найден в .env файле.")
                self.sheet_service = None
            else:
                # 🔥 ИСПРАВЛЕНИЕ: Передаем имя файла ключей И ссылку на таблицу
                # Файл 'credentials.json' должен лежать рядом с main.py
                self.sheet_service = SheetService("credentials.json", SHEET_URL)
                print("✅ Google Sheets Service успешно запущен!")

        except Exception as e:
            print(f"⚠️ Ошибка запуска Google Sheets: {e}")
            self.sheet_service = None

        # --- 3. Загрузка когов ---
        # (Этот блок теперь вынесен из except, чтобы грузился всегда)
        if os.path.exists("./cogs"):
            for filename in os.listdir("./cogs"):
                if filename.endswith(".py") and filename != "__init__.py":
                    try:
                        await self.load_extension(f"cogs.{filename[:-3]}")
                        print(f"🧩 Загружен ког: {filename}")
                    except Exception as e:
                        print(f"❌ Не удалось загрузить {filename}: {e}")
        else:
            print("⚠️ Папка cogs не найдена!")

        # --- 4. Регистрация Кнопок (Persistent Views) ---
        self.add_view(ProfileManageView())
        print("✅ Кнопки профиля зарегистрированы.")

        # --- 5. Синхронизация команд ---
        try:
            if GUILD_ID:
                guild_object = discord.Object(id=int(GUILD_ID))
                self.tree.copy_global_to(guild=guild_object)
                await self.tree.sync(guild=guild_object)
                print(f"🌲 Команды синхронизированы с гильдией ID: {GUILD_ID}")
            else:
                await self.tree.sync()
                print("🌲 Глобальная синхронизация команд.")
        except Exception as e:
            print(f"❌ Ошибка синхронизации команд: {e}")


async def main():
    if not DISCORD_TOKEN:
        print("❌ Ошибка: DISCORD_TOKEN не найден в .env")
        return

    bot = LeagueBot()
    async with bot:
        await bot.start(DISCORD_TOKEN)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass