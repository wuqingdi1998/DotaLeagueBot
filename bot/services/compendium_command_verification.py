from __future__ import annotations

import asyncio
import os
from collections.abc import Sequence

import discord
from discord import app_commands


CURRENT_COMPENDIUM_COMMAND_NAMES = {"add_stars", "delete_stars", "compendium", "completestars"}


def verify_current_compendium_commands(commands: Sequence[app_commands.AppCommand]) -> None:
    registered = {command.name: command for command in commands}
    for name in sorted(CURRENT_COMPENDIUM_COMMAND_NAMES):
        command = registered.get(name)
        if command is None or "октябрь" not in command.description:
            raise RuntimeError(f"October Compendium command is missing or outdated: {name}")
        if name in {"add_stars", "delete_stars"}:
            reason = next((option for option in command.options if option.name == "reason"), None)
            if reason is None or not getattr(reason, "required", False):
                raise RuntimeError(f"October Compendium command requires a reason: {name}")


async def verify_registered_commands() -> None:
    client = discord.Client(intents=discord.Intents.none())
    tree = app_commands.CommandTree(client)
    guild_id = os.getenv("GUILD_ID")
    guild = discord.Object(id=int(guild_id)) if guild_id else None
    async with client:
        await client.login(os.environ["DISCORD_TOKEN"])
        for attempt in range(12):
            try:
                verify_current_compendium_commands(await tree.fetch_commands(guild=guild))
                print("Verified October Compendium commands: " + ", ".join(sorted(CURRENT_COMPENDIUM_COMMAND_NAMES)))
                return
            except RuntimeError:
                if attempt == 11:
                    raise
                await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(verify_registered_commands())
