import aiohttp
import discord
from discord import Webhook

LOG_WEBHOOK_URL = "https://discord.com/api/webhooks/1456999075953250446/nk9fuRJtCiDBLfD9Szep5WlIE29RHjH7TLsZIgdzpsoQvMGwF5i3fYHk3W8nkeNbx-BW"


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