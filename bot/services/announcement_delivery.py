import io

import discord


WEBHOOK_NAME = "LS Bot"

DISCORD_CONTENT_LIMIT = 2000
DISCORD_EMBED_DESC_LIMIT = 4096
DISCORD_EMBED_TITLE_LIMIT = 256
BRAND_EMBED_COLOR = 0x00C3FF


# --- HELPER: Get or create persistent webhook ---
async def get_or_create_webhook(channel: discord.TextChannel) -> discord.Webhook:
    """Find an existing persistent webhook or create one."""
    webhooks = await channel.webhooks()
    for wh in webhooks:
        if wh.name == WEBHOOK_NAME:
            return wh
    return await channel.create_webhook(name=WEBHOOK_NAME)


def split_for_discord(text: str, limit: int = DISCORD_CONTENT_LIMIT) -> list[str]:
    """Split text into <= limit-char chunks, preferring line breaks, then spaces."""
    if not text:
        return []
    if len(text) <= limit:
        return [text]

    chunks: list[str] = []
    remaining = text
    while len(remaining) > limit:
        window = remaining[:limit]
        cut = window.rfind("\n")
        if cut <= 0:
            cut = window.rfind(" ")
        if cut <= 0:
            cut = limit
        chunk = remaining[:cut].rstrip()
        if chunk:
            chunks.append(chunk)
        remaining = remaining[cut:].lstrip("\n").lstrip(" ")

    tail = remaining.rstrip()
    if tail:
        chunks.append(tail)
    return chunks


def build_messages(prefix: str, body: str, limit: int = DISCORD_CONTENT_LIMIT) -> list[str]:
    """Build a list of Discord-sized messages: `prefix` is prepended to the first only."""
    prefix = prefix or ""
    body = body or ""
    sep = "\n" if prefix and body else ""
    first_budget = limit - len(prefix) - len(sep)

    if not body:
        head = prefix.rstrip()
        return [head] if head else []

    if first_budget < 1:
        # Prefix alone already at/over the limit — emit it separately.
        head = prefix.rstrip()
        rest = split_for_discord(body, limit)
        return ([head] if head else []) + rest

    if len(body) <= first_budget:
        head = (prefix + sep + body).rstrip()
        return [head] if head else []

    window = body[:first_budget]
    cut = window.rfind("\n")
    if cut <= 0:
        cut = window.rfind(" ")
    if cut <= 0:
        cut = first_budget
    first_body = body[:cut].rstrip()
    remaining = body[cut:].lstrip()

    head = (prefix + sep + first_body).rstrip()
    rest = split_for_discord(remaining, limit) if remaining else []
    return ([head] if head else []) + rest


def build_announcement_embed(title: str | None, description: str) -> discord.Embed:
    """Create an announcement embed in the Linken's Sphere brand color."""
    return discord.Embed(
        title=title,
        description=description,
        color=BRAND_EMBED_COLOR,
    )


def build_files(files_data):
    return [discord.File(io.BytesIO(data), filename=name) for name, data in files_data]


async def send_announcement(channel, username, avatar_url, mentions, proc_text, embed, files_data):
    """Deliver one announcement, attaching files only once and pinging only in its first part."""
    webhook = await get_or_create_webhook(channel)

    if embed:
        files = build_files(files_data)
        if files:
            embed.set_image(url=f"attachment://{files_data[0][0]}")
        first_msg = await webhook.send(
            content=mentions or "",
            embed=embed,
            files=files,
            username=username,
            avatar_url=avatar_url,
            allowed_mentions=discord.AllowedMentions.all(),
            wait=True,
        )
    else:
        messages = build_messages(mentions, proc_text, DISCORD_CONTENT_LIMIT)
        if not messages:
            # No text, but there may still be an image-only post to send.
            if files_data:
                first_msg = await webhook.send(
                    content=mentions or "",
                    files=build_files(files_data),
                    username=username,
                    avatar_url=avatar_url,
                    allowed_mentions=discord.AllowedMentions.all(),
                    wait=True,
                )
                return first_msg
            raise ValueError("Пустое сообщение")

        first_msg = None
        last_idx = len(messages) - 1
        for i, content in enumerate(messages):
            files = build_files(files_data) if i == last_idx else []
            allowed = (
                discord.AllowedMentions.all() if i == 0
                else discord.AllowedMentions.none()
            )
            sent = await webhook.send(
                content=content,
                files=files,
                username=username,
                avatar_url=avatar_url,
                allowed_mentions=allowed,
                wait=True,
            )
            if i == 0:
                first_msg = sent

    return first_msg
