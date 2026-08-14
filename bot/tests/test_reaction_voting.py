from types import SimpleNamespace
from unittest.mock import AsyncMock

from cogs.reaction_voting import (
    REACTION_VOTING_CHANNEL_ID,
    REACTION_VOTING_EMOJIS,
    ReactionVoting,
    is_reaction_voting_channel,
)


def test_voting_channel_includes_channel_and_its_forum_threads() -> None:
    channel = SimpleNamespace(id=REACTION_VOTING_CHANNEL_ID, parent_id=None)
    forum_thread = SimpleNamespace(id=22, parent_id=REACTION_VOTING_CHANNEL_ID)
    unrelated_channel = SimpleNamespace(id=33, parent_id=None)

    assert is_reaction_voting_channel(channel) is True
    assert is_reaction_voting_channel(forum_thread) is True
    assert is_reaction_voting_channel(unrelated_channel) is False


async def test_new_message_receives_both_voting_reactions() -> None:
    channel = SimpleNamespace(id=REACTION_VOTING_CHANNEL_ID, parent_id=None)
    message = SimpleNamespace(
        id=44,
        channel=channel,
        add_reaction=AsyncMock(),
    )
    cog = ReactionVoting(SimpleNamespace())

    await cog.on_message(message)

    assert [call.args[0] for call in message.add_reaction.await_args_list] == list(
        REACTION_VOTING_EMOJIS
    )


async def test_disallowed_reaction_is_removed_from_voting_message() -> None:
    message = SimpleNamespace(remove_reaction=AsyncMock())
    channel = SimpleNamespace(
        id=REACTION_VOTING_CHANNEL_ID,
        parent_id=None,
        fetch_message=AsyncMock(return_value=message),
    )
    member = SimpleNamespace(id=55)
    bot = SimpleNamespace(get_channel=lambda _channel_id: channel)
    payload = SimpleNamespace(
        channel_id=REACTION_VOTING_CHANNEL_ID,
        message_id=66,
        user_id=member.id,
        member=member,
        emoji="🔥",
    )
    cog = ReactionVoting(bot)

    await cog.on_raw_reaction_add(payload)

    channel.fetch_message.assert_awaited_once_with(payload.message_id)
    message.remove_reaction.assert_awaited_once_with(payload.emoji, member)


async def test_allowed_reaction_is_kept() -> None:
    bot = SimpleNamespace(get_channel=AsyncMock())
    payload = SimpleNamespace(emoji="👍")
    cog = ReactionVoting(bot)

    await cog.on_raw_reaction_add(payload)

    bot.get_channel.assert_not_called()
