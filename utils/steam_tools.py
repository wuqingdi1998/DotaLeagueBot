import re

def extract_steam_id32(steam_input: str):
    steam_input = steam_input.strip()


    id64_match = re.search(r'7656119\d{10}', steam_input)
    if id64_match:
        id64 = int(id64_match.group(0))
        return id64 - 76561197960265728

    if steam_input.isdigit() and len(steam_input) < 12:
        return int(steam_input)

    match = re.search(r'profiles/(\d+)', steam_input)
    if match:
        id64 = int(match.group(1))
        return id64 - 76561197960265728

    return None