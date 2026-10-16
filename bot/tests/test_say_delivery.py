from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import discord
import pytest

from cogs.admin import ConfirmSendView


@pytest.mark.parametrize("body,has_embed,files,mentions", [
    ("hello", False, [], "@everyone"),
    ("x" * 4100, False, [("image.png", b"image")], "@everyone"),
    ("", False, [("image.png", b"image")], ""),
    ("text", True, [("image.png", b"image")], "@everyone"),
])
async def test_confirm_delivers_text_embed_and_attachments(body, has_embed, files, mentions):
    channel = SimpleNamespace(mention="#news")
    embed = discord.Embed(title="Title", description=body) if has_embed else None
    view = ConfirmSendView(channel, "Name", "https://example.com/a.png", mentions, body, embed, files)
    webhook = SimpleNamespace(send=AsyncMock(return_value=SimpleNamespace(id=123)))
    interaction = SimpleNamespace(
        response=SimpleNamespace(defer=AsyncMock()),
        followup=SimpleNamespace(send=AsyncMock()),
    )
    with patch("services.announcement_delivery.get_or_create_webhook", AsyncMock(return_value=webhook)):
        await view.confirm.callback(interaction)
    calls = webhook.send.call_args_list
    assert len(calls) == (3 if len(body) > 4000 else 1)
    assert calls[0].kwargs["allowed_mentions"].everyone
    assert all(len(call.kwargs.get("content") or "") <= 2000 for call in calls)
    assert calls[-1].kwargs["username"] == "Name"
    assert len(calls[-1].kwargs["files"]) == len(files)
    assert "123" in interaction.followup.send.call_args.args[0]
