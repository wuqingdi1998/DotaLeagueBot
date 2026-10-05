from __future__ import annotations

import datetime
import os

import discord
from discord.ext import commands, tasks

from services.compendium_unclaimed_stars import (
    CompendiumUnclaimedStarsError,
    format_unclaimed_challenges_report,
    request_unclaimed_challenges_report,
    unclaimed_player_message,
)


MOSCOW_TIME_ZONE = datetime.timezone(datetime.timedelta(hours=3), name="Europe/Moscow")
FROKENG_DISCORD_ID = 311247030422863882
COMPENDIUM_FIRST_DAY = datetime.date(2026, 10, 5)
COMPENDIUM_LAST_DAY = datetime.date(2026, 10, 25)
REPORT_CHANNEL_ID = int(
    os.getenv("COMPENDIUM_REPORT_CHANNEL_ID")
    or os.getenv("SCREEN_CHANNEL_ID")
    or 0
)


class OctoberCompendiumReminders(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.remind_unclaimed_stars.start()

    async def cog_unload(self) -> None:
        self.remind_unclaimed_stars.cancel()

    async def _report_channel(self) -> discord.abc.Messageable | None:
        if not REPORT_CHANNEL_ID:
            return None
        channel = self.bot.get_channel(REPORT_CHANNEL_ID)
        if channel is not None:
            return channel
        try:
            return await self.bot.fetch_channel(REPORT_CHANNEL_ID)
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            return None

    @tasks.loop(time=datetime.time(hour=23, minute=0, tzinfo=MOSCOW_TIME_ZONE))
    async def remind_unclaimed_stars(self) -> None:
        today = datetime.datetime.now(MOSCOW_TIME_ZONE).date()
        if not COMPENDIUM_FIRST_DAY <= today <= COMPENDIUM_LAST_DAY:
            return
        try:
            report = await request_unclaimed_challenges_report()
        except CompendiumUnclaimedStarsError as error:
            print(f"⚠️ Вечерняя проверка звёзд не выполнена: {error}")
            return

        delivered = 0
        failed = 0
        for player in report.players:
            try:
                user = self.bot.get_user(player.player_id)
                if user is None:
                    user = await self.bot.fetch_user(player.player_id)
                await user.send(unclaimed_player_message(player))
                delivered += 1
            except (discord.Forbidden, discord.NotFound, discord.HTTPException):
                failed += 1

        channel = await self._report_channel()
        messages = format_unclaimed_challenges_report(report)
        summary = f"\nЛично уведомлены: **{delivered}**. Не доставлено: **{failed}**."
        if channel is not None:
            for index, message in enumerate(messages):
                content = message + (summary if index == len(messages) - 1 else "")
                await channel.send(
                    content,
                    allowed_mentions=discord.AllowedMentions.none(),
                )
        else:
            frokeng = self.bot.get_user(FROKENG_DISCORD_ID)
            if frokeng is None:
                frokeng = await self.bot.fetch_user(FROKENG_DISCORD_ID)
            for index, message in enumerate(messages):
                await frokeng.send(message + (summary if index == len(messages) - 1 else ""))

    @remind_unclaimed_stars.before_loop
    async def before_reminder(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(OctoberCompendiumReminders(bot))
