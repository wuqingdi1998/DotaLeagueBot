from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime

import aiohttp
import discord
from discord.ext import commands
from sqlalchemy import text

from services.compendium_match_audit_model import (
    AUDIT_CHANNEL_ID,
    STOCKHOLM_REGION,
    audit_message,
    match_region,
    validated_match_details,
)

AUDIT_BATCH_SIZE = 10


def audit_session():
    from database.core import async_session

    return async_session()


async def next_audit_due_at() -> datetime | None:
    async with audit_session() as session:
        result = await session.execute(text(
            "SELECT MIN(next_attempt_at) FROM match_region_audits WHERE status = 'pending'"
        ))
        return result.scalar_one_or_none()


async def fetch_match_details(http: aiohttp.ClientSession, match_id: int) -> dict:
    params = {}
    api_key = os.getenv("OPENDOTA_API_KEY")
    if api_key:
        params["api_key"] = api_key
    async with http.get(
        f"https://api.opendota.com/api/matches/{match_id}", params=params,
    ) as response:
        if response.status != 200:
            raise RuntimeError(f"OpenDota status {response.status}")
        return validated_match_details(await response.json(), match_id)


async def process_match_audits(bot: commands.Bot) -> None:
    details_cache: dict[int, dict] = {}
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=12)) as http:
        for _ in range(AUDIT_BATCH_SIZE):
            async with audit_session() as session:
                async with session.begin():
                    result = await session.execute(text(
                        "SELECT * FROM match_region_audits "
                        "WHERE status = 'pending' AND next_attempt_at <= NOW() "
                        "ORDER BY next_attempt_at, id FOR UPDATE SKIP LOCKED LIMIT 1"
                    ))
                    row = result.mappings().first()
                    if row is None:
                        return
                    audit = dict(row)
                    try:
                        match_id = audit["match_id"]
                        details = audit["match_details"] or details_cache.get(match_id)
                        if details is None:
                            details = await fetch_match_details(http, match_id)
                        details_cache[match_id] = details
                        # Retain fetched details if Discord delivery needs another attempt.
                        await session.execute(text(
                            "UPDATE match_region_audits SET match_details = CAST(:details AS jsonb) "
                            "WHERE id = :id"
                        ), {"id": audit["id"], "details": json.dumps(details)})
                        message_id = None
                        if match_region(details) != STOCKHOLM_REGION:
                            channel = bot.get_channel(AUDIT_CHANNEL_ID) or await bot.fetch_channel(AUDIT_CHANNEL_ID)
                            if not isinstance(channel, (discord.TextChannel, discord.Thread)):
                                raise RuntimeError("Audit channel is not a text channel")
                            message = await channel.send(
                                embed=audit_message(audit, details),
                                allowed_mentions=discord.AllowedMentions.none(),
                            )
                            message_id = message.id
                        await session.execute(text(
                            "UPDATE match_region_audits "
                            "SET status = :status, discord_message_id = :message_id, "
                            "finished_at = NOW(), last_error = NULL WHERE id = :id"
                        ), {"id": audit["id"], "message_id": message_id,
                            "status": "sent" if message_id is not None else "stockholm"})
                    except (aiohttp.ClientError, asyncio.TimeoutError, discord.HTTPException,
                            ValueError, RuntimeError) as error:
                        await session.execute(text(
                            "UPDATE match_region_audits SET attempts = attempts + 1, "
                            "next_attempt_at = NOW() + make_interval(secs => LEAST(3600, "
                            "60 * power(2, LEAST(attempts, 6))::int)), last_error = :error WHERE id = :id"
                        ), {"id": audit["id"], "error": f"{type(error).__name__}: retry required"})
                        print(f"[COMPENDIUM-AUDIT] Audit {audit['id']} delayed: {type(error).__name__}")
