"""Persistent announcement queue and Moscow date validation."""

import base64
import json
import re
from datetime import datetime, timedelta, timezone

from sqlalchemy import text


MOSCOW_TIMEZONE = timezone(timedelta(hours=3), "МСК")
SAY_INPUT_TIMEOUT_SECONDS = 600
POST_DATE_FORMAT = "%H:%M %d.%m.%Y"


def parse_post_date(value: str, now: datetime | None = None) -> datetime:
    value = value.strip()
    if not re.fullmatch(r"\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}", value):
        raise ValueError("Укажите дату в формате HH:MM DD.MM.YYYY, например 19:30 25.12.2026 (МСК).")
    try:
        scheduled_at = datetime.strptime(value, POST_DATE_FORMAT).replace(tzinfo=MOSCOW_TIMEZONE)
    except ValueError:
        raise ValueError("Такой даты или времени не существует. Проверьте ввод (МСК).") from None
    require_future_date(scheduled_at, now)
    return scheduled_at


def require_future_date(scheduled_at: datetime, now: datetime | None = None) -> None:
    if scheduled_at <= (now or datetime.now(timezone.utc)):
        raise ValueError("Время публикации уже прошло. Укажите будущую дату и время по Москве.")


def encode_post(username, avatar_url, mentions, proc_text, embed, files_data) -> str:
    return json.dumps({
        "username": username,
        "avatar_url": avatar_url,
        "mentions": mentions,
        "proc_text": proc_text,
        "embed": embed.to_dict() if embed else None,
        "files": [{"name": name, "data": base64.b64encode(data).decode("ascii")}
                  for name, data in files_data],
    })


def decode_files(payload: dict) -> list[tuple[str, bytes]]:
    return [(item["name"], base64.b64decode(item["data"])) for item in payload["files"]]


async def lock_guild_queue(session, guild_id: int) -> None:
    # Serialize cancellation and sending so a deleted queued post cannot start later.
    await session.execute(text("SELECT pg_advisory_xact_lock(:guild_id)"), {"guild_id": guild_id})


async def enqueue_post(session, *, post_id, guild_id, channel_id, author_id, scheduled_at, payload):
    require_future_date(scheduled_at)
    await session.execute(text("""
        INSERT INTO postponed_posts (id, guild_id, channel_id, author_id, scheduled_at, payload)
        VALUES (:id, :guild_id, :channel_id, :author_id, :scheduled_at, CAST(:payload AS jsonb))
        ON CONFLICT (id) DO NOTHING
    """), {"id": post_id, "guild_id": guild_id, "channel_id": channel_id,
           "author_id": author_id, "scheduled_at": scheduled_at, "payload": payload})
    await session.commit()


async def cancel_guild_posts(session, guild_id: int) -> int:
    await lock_guild_queue(session, guild_id)
    result = await session.execute(text("""
        UPDATE postponed_posts SET status = 'cancelled', payload = '{}'::jsonb
        WHERE guild_id = :guild_id AND status = 'pending' RETURNING id
    """), {"guild_id": guild_id})
    count = len(result.all())
    await session.commit()
    return count
