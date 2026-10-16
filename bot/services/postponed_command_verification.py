"""Read-only production check of postponed announcement command registration."""

import asyncio
import os

import discord
from discord import app_commands


def verify_postponed_commands(commands):
    registered = {command.name: command for command in commands}
    if "postponed_del" not in registered or "say" not in registered:
        raise RuntimeError("Postponed announcement commands are missing")
    option = next((item for item in registered["say"].options if item.name == "отложить"), None)
    if option is None or option.required:
        raise RuntimeError("The optional /say отложить parameter is missing")


async def main():
    client = discord.Client(intents=discord.Intents.none())
    tree = app_commands.CommandTree(client)
    guild_id = os.getenv("GUILD_ID")
    guild = discord.Object(id=int(guild_id)) if guild_id else None
    async with client:
        await client.login(os.environ["DISCORD_TOKEN"])
        for attempt in range(12):
            try:
                verify_postponed_commands(await tree.fetch_commands(guild=guild))
            except RuntimeError:
                if attempt == 11:
                    raise
                await asyncio.sleep(5)
            else:
                print("Verified /say отложить and /postponed_del commands")
                return


if __name__ == "__main__":
    asyncio.run(main())
