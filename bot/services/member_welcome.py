from typing import Protocol

import discord

from utils.website_notifications import member_welcome_embed


class WelcomeRecipient(Protocol):
    async def send(self, *, embed: discord.Embed) -> object: ...


async def send_member_welcome(recipient: WelcomeRecipient) -> None:
    await recipient.send(embed=member_welcome_embed())
