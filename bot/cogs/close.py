import os
import asyncio
from collections import defaultdict
from datetime import datetime, timezone, timedelta

import discord
from discord import app_commands
from discord.ext import commands
from sqlalchemy import select
from dotenv import load_dotenv

from database.core import async_session
from database.models import CloseEvent

load_dotenv()

CLOSE_CHANNEL_ID = int(os.getenv("CLOSE_CHANNEL_ID") or 0)
CLOSE_HOST_ROLE_ID = int(os.getenv("CLOSE_HOST_ROLE_ID") or 0)

MSK = timezone(timedelta(hours=3))
CHECK_EMOJI = "✅"


def _build_content(ev: CloseEvent, ids: list[str]) -> str:
    """Render the close announcement exactly per spec. Reused for the first post and every edit."""
    people = ", ".join(f"<@{i}>" for i in ids) if ids else "Пока нет участников"
    return (
        "@everyone\n"
        "📢 Открыта регистрация на клоз!\n"
        f"В <t:{ev.start_ts}:t> <t:{ev.start_ts}:D> на сервере состоится клоз-матч\n"
        f"Формат: {ev.game_format}, Best of {ev.series} (Хост — <@{ev.host_id}>)\n"
        "Для регистрации на ивент нужно поставить реакцию ✅ на это сообщение\n"
        "Для отказа от участия после регистрации нужно написать хосту\n\n"
        "Участники:\n"
        f"{people}"
    )


class Close(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        # Serialise concurrent ✅ clicks on the same message so the read-modify-write
        # of participant_ids can't drop anyone.
        self._locks: dict[int, asyncio.Lock] = defaultdict(asyncio.Lock)

    @app_commands.command(name="say_close", description="[Close Host] Опубликовать анонс клоза")
    @app_commands.describe(
        game_format="Формат игры (любой текст, напр. Fearless Captains Mode)",
        series="Формат серии",
        date="Дата начала ДД.ММ.ГГГГ (напр. 15.08.2026)",
        time="Время начала по МСК ЧЧ:ММ (напр. 20:00)",
    )
    @app_commands.choices(series=[
        app_commands.Choice(name="BO1", value="1"),
        app_commands.Choice(name="BO2", value="2"),
        app_commands.Choice(name="BO3", value="3"),
    ])
    @app_commands.checks.has_role(CLOSE_HOST_ROLE_ID)
    async def say_close(self, interaction: discord.Interaction, game_format: str,
                        series: app_commands.Choice[str], date: str, time: str):
        # --- 1. Валидация даты/времени (МСК → Unix timestamp) ---
        try:
            dt = datetime.strptime(f"{date} {time}", "%d.%m.%Y %H:%M").replace(tzinfo=MSK)
        except ValueError:
            return await interaction.response.send_message(
                "❌ Неверный формат даты/времени. Дата — `ДД.ММ.ГГГГ` (напр. 15.08.2026), "
                "время — `ЧЧ:ММ` (напр. 20:00).",
                ephemeral=True,
            )
        start_ts = int(dt.timestamp())

        # --- 2. Проверка настройки канала ---
        if not CLOSE_CHANNEL_ID:
            return await interaction.response.send_message(
                "❌ Канал для клоза не настроен (CLOSE_CHANNEL_ID).", ephemeral=True
            )
        channel = self.bot.get_channel(CLOSE_CHANNEL_ID)
        if channel is None:
            try:
                channel = await self.bot.fetch_channel(CLOSE_CHANNEL_ID)
            except Exception:
                return await interaction.response.send_message(
                    "❌ Не удалось найти канал для клоза (проверьте CLOSE_CHANNEL_ID).", ephemeral=True
                )

        await interaction.response.defer(ephemeral=True)

        # --- 3. Публикация анонса ---
        ev = CloseEvent(
            message_id=0,  # заполняется после отправки
            channel_id=channel.id,
            host_id=interaction.user.id,
            game_format=game_format,
            series=series.value,
            start_ts=start_ts,
            participant_ids="",
        )
        try:
            sent = await channel.send(
                content=_build_content(ev, []),
                allowed_mentions=discord.AllowedMentions.all(),
            )
        except discord.Forbidden:
            return await interaction.followup.send(
                f"❌ Нет прав отправлять сообщения в {channel.mention}.", ephemeral=True
            )
        except Exception as e:
            return await interaction.followup.send(f"❌ Ошибка отправки анонса: {e}", ephemeral=True)

        # --- 4. Реакция ✅ ---
        try:
            await sent.add_reaction(CHECK_EMOJI)
        except Exception as e:
            print(f"[CLOSE] Не удалось добавить реакцию: {e}")

        # --- 5. Сохранение в БД ---
        try:
            ev.message_id = sent.id
            async with async_session() as session:
                session.add(ev)
                await session.commit()
        except Exception as e:
            return await interaction.followup.send(
                f"⚠️ Анонс опубликован, но не сохранён в БД (регистрация не будет работать): {e}",
                ephemeral=True,
            )

        # --- 6. Подтверждение ---
        await interaction.followup.send("✅ Анонс клоза успешно опубликован.", ephemeral=True)

    @say_close.error
    async def say_close_error(self, interaction: discord.Interaction, error: app_commands.AppCommandError):
        if isinstance(error, (app_commands.MissingRole, app_commands.MissingAnyRole, app_commands.CheckFailure)):
            msg = "⛔ Нужна роль Close Host."
        else:
            print(f"[CLOSE] Ошибка say_close: {error}")
            msg = f"❌ Ошибка: {error}"
        if interaction.response.is_done():
            await interaction.followup.send(msg, ephemeral=True)
        else:
            await interaction.response.send_message(msg, ephemeral=True)

    @commands.Cog.listener()
    async def on_raw_reaction_add(self, payload: discord.RawReactionActionEvent):
        # Регистрация происходит только через реакцию ✅.
        if payload.user_id == self.bot.user.id:
            return
        if str(payload.emoji) != CHECK_EMOJI:
            return

        async with self._locks[payload.message_id]:
            async with async_session() as session:
                result = await session.execute(
                    select(CloseEvent).where(CloseEvent.message_id == payload.message_id)
                )
                ev = result.scalar_one_or_none()
                if ev is None:
                    return  # сообщение не является анонсом клоза

                ids = [i for i in ev.participant_ids.split(",") if i]
                if str(payload.user_id) in ids:
                    return  # уже зарегистрирован
                ids.append(str(payload.user_id))
                ev.participant_ids = ",".join(ids)
                await session.commit()

                # Снимок нужных полей, пока сессия открыта.
                channel_id = ev.channel_id
                message_id = ev.message_id
                content = _build_content(ev, ids)

        # --- Обновляем список участников в сообщении ---
        channel = self.bot.get_channel(channel_id)
        if channel is None:
            try:
                channel = await self.bot.fetch_channel(channel_id)
            except Exception:
                return
        try:
            msg = await channel.fetch_message(message_id)
            # allowed_mentions=none — правка списка не должна заново пинговать участников/@everyone.
            await msg.edit(content=content, allowed_mentions=discord.AllowedMentions.none())
        except discord.NotFound:
            return
        except Exception as e:
            print(f"[CLOSE] Не удалось обновить список участников: {e}")


async def setup(bot):
    await bot.add_cog(Close(bot))
