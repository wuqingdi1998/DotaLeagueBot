from __future__ import annotations

import os

import aiohttp


class SiteSchedulerConfigurationError(RuntimeError):
    pass


async def post_site_scheduler_request(
    path: str,
    timeout_seconds: int = 15,
) -> dict[str, object]:
    secret = (
        os.getenv("COMPENDIUM_SCHEDULER_SECRET")
        or os.getenv("DISCORD_TOKEN")
        or ""
    ).strip()
    site_url = (
        os.getenv("COMPENDIUM_SITE_URL")
        or os.getenv("PUBLIC_BASE_URL")
        or ""
    ).rstrip("/")
    public_origin = (os.getenv("PUBLIC_BASE_URL") or site_url).rstrip("/")
    if len(secret) < 24 or not site_url:
        raise SiteSchedulerConfigurationError(
            "Внутренние фоновые запросы сайта не настроены"
        )

    timeout = aiohttp.ClientTimeout(total=timeout_seconds)
    headers = {
        "Authorization": f"Bearer {secret}",
        "Origin": public_origin,
    }
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(
            f"{site_url}{path}",
            headers=headers,
        ) as response:
            if response.status != 200:
                raise RuntimeError(f"Site returned HTTP {response.status}")
            payload = await response.json()
            return payload if isinstance(payload, dict) else {}
