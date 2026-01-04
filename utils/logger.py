import aiohttp
import discord
import os
from discord import Webhook
from dotenv import load_dotenv

LOG_WEBHOOK_URL = os.getenv("LOG_WEBHOOK_URL")


async def send_log(title: str, description: str, color: discord.Color):
    if not LOG_WEBHOOK_URL: return

    async with aiohttp.ClientSession() as session:
        webhook = Webhook.from_url(LOG_WEBHOOK_URL, session=session)

        embed = discord.Embed(title=title, description=description, color=color)
        embed.set_footer(text="Dota League System Log")

        try:
            await webhook.send(embed=embed, username="League Observer")
        except Exception as e:
            print(f"[ERROR] Failed to send webhook log: {e}")