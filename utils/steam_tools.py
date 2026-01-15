import re
import aiohttp
import os

STEAM_API_KEY = os.getenv("STEAM_API_KEY")  # Не забудь добавить в .env


async def resolve_steam_id(steam_input: str) -> int | None:
    steam_input = steam_input.strip()


    id64_match = re.search(r'(7656119\d{10})', steam_input)
    if id64_match:
        id64 = int(id64_match.group(1))
        return id64 - 76561197960265728

    if steam_input.isdigit() and len(steam_input) < 16:
        return int(steam_input)

    custom_url_match = re.search(r'steamcommunity\.com/id/([a-zA-Z0-9_-]+)', steam_input)

    if custom_url_match and STEAM_API_KEY:
        vanity_url = custom_url_match.group(1)

        url = "http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/"
        params = {
            'key': STEAM_API_KEY,
            'vanityurl': vanity_url
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get('response', {}).get('success') == 1:
                        id64 = int(data['response']['steamid'])
                        return id64 - 76561197960265728

    return None