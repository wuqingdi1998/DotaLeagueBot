from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from services.channel_announcement_edits import edit_channel_announcement


@pytest.mark.asyncio
async def test_edits_existing_message_without_new_posts_or_mentions():
    content = "@everyone\n25.10.2026 (Воскресенье) 21:00"
    message = SimpleNamespace(edit=AsyncMock(return_value=SimpleNamespace(content=content)))
    channel = SimpleNamespace(fetch_message=AsyncMock(return_value=message), send=AsyncMock())
    bot = SimpleNamespace(get_channel=lambda _: channel, fetch_channel=AsyncMock())
    await edit_channel_announcement(bot, 12, 34, content)
    channel.fetch_message.assert_awaited_once_with(34)
    channel.send.assert_not_awaited()
    kwargs = message.edit.call_args.kwargs
    assert kwargs["content"] == content
    assert not kwargs["allowed_mentions"].everyone
    assert not kwargs["allowed_mentions"].users
    assert not kwargs["allowed_mentions"].roles


@pytest.mark.asyncio
async def test_requires_discord_to_confirm_updated_text():
    channel = SimpleNamespace(fetch_message=AsyncMock(return_value=SimpleNamespace(
        edit=AsyncMock(return_value=SimpleNamespace(content="old")),
    )))
    bot = SimpleNamespace(get_channel=lambda _: None, fetch_channel=AsyncMock(return_value=channel))
    with pytest.raises(ValueError, match="confirm"):
        await edit_channel_announcement(bot, 12, 34, "new")
    bot.fetch_channel.assert_awaited_once_with(12)


@pytest.mark.asyncio
@pytest.mark.parametrize("fails", [False, True])
async def test_queue_keeps_failed_edits_for_retry_and_removes_confirmed_edits(monkeypatch, fails):
    from services.channel_announcement_edits import deliver_pending_announcement_edits

    edit = AsyncMock(side_effect=OSError("temporary") if fails else None)
    monkeypatch.setattr("services.channel_announcement_edits.edit_channel_announcement", edit)
    row = {"announcement_id": 1, "channel_id": 12, "discord_message_id": 34, "content": "new"}
    result = SimpleNamespace(mappings=lambda: SimpleNamespace(all=lambda: [row]))
    session = SimpleNamespace(execute=AsyncMock(side_effect=[result, None]), commit=AsyncMock())
    await deliver_pending_announcement_edits(SimpleNamespace(), session)
    query = str(session.execute.call_args_list[1].args[0])
    assert ("attempts = attempts + 1" if fails else "DELETE FROM") in query
    session.commit.assert_awaited_once()
