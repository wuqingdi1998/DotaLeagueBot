from __future__ import annotations

import os
from datetime import datetime

import aiohttp
import discord
from discord.ext import commands
from discord.http import handle_message_parameters
from sqlalchemy import text

COMPENDIUM_REVIEWER_DISCORD_ID = 311247030422863882


def verification_session():
    from database.core import async_session

    return async_session()


async def next_verification_due_at() -> datetime | None:
    async with verification_session() as session:
        result = await session.execute(text(
            "SELECT MIN(due_at) FROM ("
            "SELECT GREATEST(next_attempt_at, COALESCE(lease_until, next_attempt_at)) AS due_at "
            "FROM october_compendium_verification_requests WHERE status = 'pending' "
            "UNION ALL SELECT GREATEST(notification_retry_at, COALESCE(lease_until, notification_retry_at)) "
            "FROM october_compendium_verification_requests WHERE status = 'exhausted' AND notified_at IS NULL"
            ") deadlines"
        ))
        return result.scalar_one_or_none()


async def request_due_verifications() -> None:
    secret = (os.getenv("COMPENDIUM_SCHEDULER_SECRET") or os.getenv("DISCORD_TOKEN") or "").strip()
    site_url = (os.getenv("COMPENDIUM_SITE_URL") or os.getenv("PUBLIC_BASE_URL") or "").rstrip("/")
    if not site_url or len(secret) < 24:
        raise RuntimeError("Compendium retry connection is not configured")
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=160)) as http:
        async with http.post(
            f"{site_url}/api/internal/compendium/verification-retries",
            headers={"Authorization": f"Bearer {secret}", "Origin": os.getenv("PUBLIC_BASE_URL") or site_url},
        ) as response:
            if response.status != 200:
                raise RuntimeError(f"Compendium retries returned HTTP {response.status}")
            payload = await response.json()
            if not isinstance(payload, dict) or payload.get("ok") is not True:
                raise RuntimeError("Compendium retries returned an invalid response")


def exhausted_verification_message(request: dict) -> str:
    snapshot = request["snapshot"]
    name = discord.utils.escape_markdown(str(request["player_name"]))
    title = discord.utils.escape_markdown(str(snapshot["title"]))
    return (
        f"**Не удалось проверить задание за два часа**\n"
        f"Игрок: **{name}**\nЗадание: **{title}**\n"
        f"Дата задания: **{request['moscow_date']} (МСК)**\n"
        f"Автоматических попыток: {request['attempts']}\n"
        f"Последний результат: {request['last_error'] or 'Результат не найден'}\n"
        "Автоматические повторы завершены. Проверьте игру на альтернативных площадках "
        "и при необходимости засчитайте исходное задание вручную.\n"
        f"{os.getenv('PUBLIC_BASE_URL', 'https://lsesports.ru').rstrip('/')}/compendium/base"
    )


async def deliver_verification_notifications(bot: commands.Bot) -> None:
    for _ in range(10):
        async with verification_session() as session:
            async with session.begin():
                result = await session.execute(text(
                    "SELECT request.*, player.ingame_name AS player_name "
                    "FROM october_compendium_verification_requests request "
                    "JOIN players player ON player.discord_id = request.player_id "
                    "WHERE request.status = 'exhausted' AND request.notified_at IS NULL "
                    "AND request.notification_retry_at <= NOW() "
                    "AND (request.lease_until IS NULL OR request.lease_until <= NOW()) "
                    "ORDER BY request.finished_at, request.id FOR UPDATE OF request SKIP LOCKED LIMIT 1"
                ))
                row = result.mappings().first()
                if row is None:
                    return
                request = dict(row)
                try:
                    reviewer = bot.get_user(COMPENDIUM_REVIEWER_DISCORD_ID) or await bot.fetch_user(COMPENDIUM_REVIEWER_DISCORD_ID)
                    channel = reviewer.dm_channel or await reviewer.create_dm()
                    # A stable enforced nonce also deduplicates delivery if sending succeeded but saving its receipt failed.
                    with handle_message_parameters(
                        content=exhausted_verification_message(request),
                        nonce=f"cv-{request['id']}", allowed_mentions=discord.AllowedMentions.none(),
                    ) as parameters:
                        if parameters.payload is None:
                            raise RuntimeError("Discord message payload is missing")
                        parameters.payload["enforce_nonce"] = True
                        message = await bot.http.send_message(channel.id, params=parameters)
                    await session.execute(text(
                        "UPDATE october_compendium_verification_requests SET notified_at = NOW(), "
                        "discord_message_id = :message_id, notification_error = NULL WHERE id = :id"
                    ), {"id": request["id"], "message_id": int(message["id"])})
                except (discord.HTTPException, OSError, TimeoutError) as error:
                    await session.execute(text(
                        "UPDATE october_compendium_verification_requests "
                        "SET notification_retry_at = NOW() + INTERVAL '5 minutes', notification_error = :error WHERE id = :id"
                    ), {"id": request["id"], "error": f"Discord notification failed: {type(error).__name__}"})


async def process_verification_retries(bot: commands.Bot) -> None:
    # Notification delivery is independent of site availability after the final persisted attempt.
    await deliver_verification_notifications(bot)
    await request_due_verifications()
    await deliver_verification_notifications(bot)
