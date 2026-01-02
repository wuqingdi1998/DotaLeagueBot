import re

STEAM_ID64_BASE = 76561197960265728


def extract_steam_id32(user_input: str) -> int | None:
    """
    Parses user input to extract SteamID32.
    Supports:
    - Raw 32-bit ID (e.g., 12345678)
    - Raw 64-bit ID (e.g., 76561198000000000)
    - Profile Links (e.g., https://steamcommunity.com/profiles/76561198000000000/)

    Returns:
        int: SteamID32 if successful
        None: If input is invalid
    """

    # Clean up input (remove spaces)
    text = user_input.strip()

    # 1. Try to find a long number (SteamID64) in the text or URL
    match_64 = re.search(r'7656119[0-9]{10}', text)

    if match_64:
        steam_id64 = int(match_64.group())
        steam_id32 = steam_id64 - STEAM_ID64_BASE
        return steam_id32

    # 2. If no 64-bit ID found, check if it is already a 32-bit ID (short number)
    if text.isdigit():
        return int(text)

    return None