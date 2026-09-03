import os
import re

import aiohttp


STEAM_API_KEY = os.getenv("STEAM_API_KEY")
STEAM_ID64_OFFSET = 76561197960265728
MAX_STEAM_ID32 = 4294967295
STEAM_REQUEST_TIMEOUT_SECONDS = 10


def _steam_id32_from_id64(steam_id64: int) -> int | None:
    steam_id32 = steam_id64 - STEAM_ID64_OFFSET
    if 1 <= steam_id32 <= MAX_STEAM_ID32:
        return steam_id32
    return None


async def _resolve_vanity_with_api(
    session: aiohttp.ClientSession,
    vanity_url: str,
) -> int | None:
    if not STEAM_API_KEY:
        return None

    url = "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/"
    async with session.get(
        url,
        params={"key": STEAM_API_KEY, "vanityurl": vanity_url},
    ) as response:
        if response.status != 200:
            return None
        payload = await response.json(content_type=None)
        steam_id64 = payload.get("response", {}).get("steamid")
        if not steam_id64:
            return None
        return _steam_id32_from_id64(int(steam_id64))


async def _resolve_vanity_with_public_profile(
    session: aiohttp.ClientSession,
    vanity_url: str,
) -> int | None:
    url = f"https://steamcommunity.com/id/{vanity_url}/?xml=1"
    async with session.get(url) as response:
        if response.status != 200:
            return None
        profile_xml = await response.text()
    steam_id64_match = re.search(r"<steamID64>(\d+)</steamID64>", profile_xml)
    if steam_id64_match is None:
        return None
    return _steam_id32_from_id64(int(steam_id64_match.group(1)))


async def resolve_steam_id(steam_input: str) -> int | None:
    normalized_input = steam_input.strip()

    steam_id64_match = re.search(r"(7656119\d{10})", normalized_input)
    if steam_id64_match:
        return _steam_id32_from_id64(int(steam_id64_match.group(1)))

    if normalized_input.isdigit():
        steam_id32 = int(normalized_input)
        return steam_id32 if 1 <= steam_id32 <= MAX_STEAM_ID32 else None

    custom_url_match = re.search(
        r"steamcommunity\.com/id/([a-zA-Z0-9_-]+)",
        normalized_input,
        re.IGNORECASE,
    )
    if custom_url_match is None:
        return None

    vanity_url = custom_url_match.group(1)
    timeout = aiohttp.ClientTimeout(total=STEAM_REQUEST_TIMEOUT_SECONDS)
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            try:
                steam_id32 = await _resolve_vanity_with_api(session, vanity_url)
            except (aiohttp.ClientError, TimeoutError, ValueError, TypeError):
                steam_id32 = None
            if steam_id32 is not None:
                return steam_id32
            return await _resolve_vanity_with_public_profile(session, vanity_url)
    except (aiohttp.ClientError, TimeoutError, ValueError, TypeError):
        return None
