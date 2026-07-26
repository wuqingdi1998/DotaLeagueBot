from collections.abc import Iterable
from typing import Any


def collect_discord_avatar_updates(
    players: Iterable[Any],
    members: Iterable[Any],
) -> dict[int, str]:
    """Return changed Discord avatar URLs keyed by registered player ID."""
    member_by_id = {
        int(member.id): member
        for member in members
        if not getattr(member, "bot", False)
    }
    updates: dict[int, str] = {}
    for player in players:
        member = member_by_id.get(int(player.discord_id))
        if member is None:
            continue
        avatar_url = str(member.display_avatar.url)
        if avatar_url and avatar_url != player.avatar_url:
            updates[int(player.discord_id)] = avatar_url
    return updates
