from types import SimpleNamespace

from services.discord_avatar_sync import collect_discord_avatar_updates


def member(discord_id: int, avatar_url: str, *, bot: bool = False):
    return SimpleNamespace(
        id=discord_id,
        bot=bot,
        display_avatar=SimpleNamespace(url=avatar_url),
    )


def player(discord_id: int, avatar_url: str | None):
    return SimpleNamespace(discord_id=discord_id, avatar_url=avatar_url)


def test_collects_only_changed_registered_member_avatars():
    updates = collect_discord_avatar_updates(
        [
            player(1, "https://cdn.discordapp.com/old.png"),
            player(2, "https://cdn.discordapp.com/same.png"),
            player(3, None),
            player(99, "https://example.com/missing.png"),
        ],
        [
            member(1, "https://cdn.discordapp.com/new.png"),
            member(2, "https://cdn.discordapp.com/same.png"),
            member(3, "https://cdn.discordapp.com/default.png"),
        ],
    )

    assert updates == {
        1: "https://cdn.discordapp.com/new.png",
        3: "https://cdn.discordapp.com/default.png",
    }


def test_ignores_bot_accounts():
    updates = collect_discord_avatar_updates(
        [player(1, None)],
        [member(1, "https://cdn.discordapp.com/bot.png", bot=True)],
    )

    assert updates == {}
