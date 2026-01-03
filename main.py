import discord
from discord.ext import commands
import os
from dotenv import load_dotenv
from database.core import init_db

load_dotenv()
TEST_GUILD_ID = 328205360466755584


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

    async def setup_hook(self):
        # 1. Init Database
        print("--- Initializing Database ---")
        await init_db()

        # 2. Load Cogs
        print("--- Loading Extensions ---")
        for filename in os.listdir('./cogs'):
            if filename.endswith('.py'):
                try:
                    await self.load_extension(f'cogs.{filename[:-3]}')
                    print(f'[OK] Loaded extension: {filename}')
                except Exception as e:
                    print(f'[ERROR] Failed to load {filename}: {e}')

        # 3. Simple Sync (Only to your Guild)
        print("--- Syncing Commands ---")
        try:
            guild_obj = discord.Object(id=TEST_GUILD_ID)
            self.tree.copy_global_to(guild=guild_obj)
            synced = await self.tree.sync(guild=guild_obj)
            print(f'[OK] Synced {len(synced)} command(s) to Guild {TEST_GUILD_ID}.')
        except Exception as e:
            print(f'[ERROR] Command sync failed: {e}')

    async def on_ready(self):
        print(f'------------------------------------')
        print(f'Logged in as: {self.user.name}')
        print(f'Bot ID: {self.user.id}')
        print(f'------------------------------------')


if __name__ == '__main__':
    bot = LeagueBot()
    token = os.getenv('DISCORD_TOKEN')
    if token:
        bot.run(token)
    else:
        print("[CRITICAL] Token not found in .env file!")