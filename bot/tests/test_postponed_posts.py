import asyncio
import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import discord
import pytest

from cogs.admin import Admin, ConfirmSendView
from services.postponed_posts import (
    SAY_INPUT_TIMEOUT_SECONDS, cancel_guild_posts, decode_files, encode_post, parse_post_date,
)


NOW = datetime(2026, 10, 16, 12, tzinfo=timezone.utc)


@pytest.fixture(autouse=True)
def database_test_settings(monkeypatch):
    for name in ("POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"):
        monkeypatch.setenv(name, "postponed_posts_unit_test")


def test_moscow_date_converts_to_expected_utc_instant():
    assert parse_post_date("16:30 16.10.2026", NOW) == NOW + timedelta(hours=1, minutes=30)


@pytest.mark.parametrize("value", [
    "12:00 16.10.2026", "15:00 16.10.2026", "10:00 01.01.2025",
    "25:00 17.10.2026", "12:60 17.10.2026", "12:00 31.02.2027",
    "1:00 17.10.2026", "2026-10-17 16:00", "", "12:00 29.02.2027",
])
def test_invalid_or_past_dates_are_rejected(value):
    with pytest.raises(ValueError):
        parse_post_date(value, NOW)


def test_payload_preserves_embed_mentions_and_attachment_bytes():
    embed = discord.Embed(title="Заголовок", description="Текст", color=0x00C3FF)
    files = [("картинка.png", b"\x00\xffimage")]
    payload = json.loads(encode_post("Автор", "avatar", "@everyone", "Текст", embed, files))
    assert payload["mentions"] == "@everyone"
    assert payload["username"] == "Автор"
    assert discord.Embed.from_dict(payload["embed"]).to_dict() == embed.to_dict()
    assert decode_files(payload) == files


def interaction_mock():
    return SimpleNamespace(
        response=SimpleNamespace(defer=AsyncMock(), send_message=AsyncMock()),
        followup=SimpleNamespace(send=AsyncMock()), user=SimpleNamespace(id=7),
    )


def session_mock():
    session = AsyncMock()
    context = MagicMock()
    context.__aenter__ = AsyncMock(return_value=session)
    context.__aexit__ = AsyncMock(return_value=False)
    return session, context


async def test_confirm_queues_once_without_publishing_immediately():
    channel = SimpleNamespace(id=22, guild=SimpleNamespace(id=11), mention="#news")
    due = datetime.now(timezone.utc) + timedelta(days=1)
    view = ConfirmSendView(channel, "Name", "avatar", "", "Body", None, [], due, 7)
    session, context = session_mock()
    interaction = interaction_mock()
    with patch("database.core.async_session", return_value=context), \
         patch("cogs.admin.enqueue_post", new_callable=AsyncMock) as enqueue, \
         patch("cogs.admin.send_announcement", new_callable=AsyncMock) as send:
        await asyncio.gather(view.confirm.callback(interaction), view.confirm.callback(interaction))
    enqueue.assert_awaited_once()
    send.assert_not_awaited()
    assert enqueue.call_args.kwargs["scheduled_at"] == due
    assert enqueue.call_args.kwargs["guild_id"] == 11
    assert "МСК" in interaction.followup.send.call_args_list[0].args[0]


async def test_confirmation_rejects_date_that_expired_during_preview():
    view = ConfirmSendView(SimpleNamespace(), "Name", None, "", "Body", None, [], NOW, 7)
    interaction = interaction_mock()
    with patch("cogs.admin.enqueue_post", new_callable=AsyncMock) as enqueue:
        await view.confirm.callback(interaction)
    enqueue.assert_not_awaited()
    assert "прошло" in interaction.followup.send.call_args.args[0]


async def test_preview_can_only_be_confirmed_by_its_author():
    view = ConfirmSendView(SimpleNamespace(), "Name", None, "", "Body", None, [], author_id=8)
    interaction = interaction_mock()
    assert not await view.interaction_check(interaction)
    interaction.response.send_message.assert_awaited_once()


async def test_say_rejects_invalid_date_before_waiting_for_text():
    bot = SimpleNamespace(wait_for=AsyncMock())
    interaction = interaction_mock()
    await Admin(bot)._say_impl(interaction, SimpleNamespace(), postpone="invalid")
    bot.wait_for.assert_not_awaited()
    assert "HH:MM DD.MM.YYYY" in interaction.response.send_message.call_args.args[0]


async def test_say_waits_ten_minutes():
    bot = SimpleNamespace(wait_for=AsyncMock(side_effect=asyncio.TimeoutError))
    interaction = interaction_mock()
    await Admin(bot)._say_impl(interaction, SimpleNamespace())
    assert bot.wait_for.call_args.kwargs["timeout"] == SAY_INPUT_TIMEOUT_SECONDS == 600
    assert "10 минут" in interaction.response.send_message.call_args.args[0]


async def test_preview_shows_schedule_without_enqueuing_until_confirmed():
    interaction = interaction_mock()
    interaction.channel = SimpleNamespace(id=33)
    user_message = SimpleNamespace(content="Пост", attachments=[], delete=AsyncMock())
    bot = SimpleNamespace(
        wait_for=AsyncMock(return_value=user_message), emojis=[],
        user=SimpleNamespace(display_avatar=SimpleNamespace(url="avatar")),
    )
    channel = SimpleNamespace(id=22, mention="#news")
    with patch("cogs.admin.enqueue_post", new_callable=AsyncMock) as enqueue:
        await Admin(bot)._say_impl(interaction, channel, postpone="19:30 25.12.2099")
    enqueue.assert_not_awaited()
    calls = interaction.followup.send.call_args_list
    assert "19:30 25.12.2099" in calls[0].kwargs["content"]
    assert not calls[0].kwargs["allowed_mentions"].everyone
    view = calls[-1].kwargs["view"]
    assert view.confirm.label == "Отложить публикацию"
    assert view.author_id == 7


async def test_cancellation_is_scoped_to_current_server():
    session = AsyncMock()
    result = MagicMock()
    result.all.return_value = [("one",), ("two",)]
    session.execute.return_value = result
    assert await cancel_guild_posts(session, 11) == 2
    sql, values = session.execute.call_args.args
    assert "guild_id = :guild_id" in str(sql)
    assert "status = 'pending'" in str(sql)
    assert values == {"guild_id": 11}
    session.commit.assert_awaited_once()


def test_optional_parameter_has_requested_discord_name():
    parameter = Admin.say.get_parameter("postpone")
    assert not parameter.required
    assert parameter.display_name == "отложить"


@pytest.mark.parametrize("is_cancelled", [False, True])
async def test_worker_delivers_persisted_post_after_restart_but_skips_cancelled(is_cancelled):
    from cogs.postponed_posts import PostponedPosts

    channel = MagicMock(spec=discord.TextChannel)
    channel.guild = SimpleNamespace(id=11)
    bot = SimpleNamespace(get_channel=lambda _: channel)
    session, context = session_mock()
    result = MagicMock()
    payload = encode_post("Name", "avatar", "@everyone", "Body", None, [("a.png", b"a")])
    result.mappings.return_value.first.return_value = None if is_cancelled else {
        "id": "one", "channel_id": 22, "payload": payload,
    }
    session.execute.return_value = result
    with patch("cogs.postponed_posts.async_session", return_value=context), \
         patch("cogs.postponed_posts.send_announcement", new_callable=AsyncMock) as send:
        await PostponedPosts(bot)._publish("one", 11)
    if is_cancelled:
        send.assert_not_awaited()
    else:
        send.assert_awaited_once()
        assert send.call_args.args[-1] == [("a.png", b"a")]
        assert session.execute.call_args.args[1]["status"] == "sent"
        session.commit.assert_awaited_once()


async def test_queue_commands_require_administrator_permissions():
    from cogs.postponed_posts import PostponedPosts

    interaction = SimpleNamespace(permissions=discord.Permissions.none())
    for command in (Admin.say, PostponedPosts.postponed_del):
        with pytest.raises(discord.app_commands.MissingPermissions):
            command.checks[0](interaction)


def test_production_command_verification_rejects_missing_option():
    from services.postponed_command_verification import verify_postponed_commands

    commands = [SimpleNamespace(name="say", options=[]), SimpleNamespace(name="postponed_del")]
    with pytest.raises(RuntimeError):
        verify_postponed_commands(commands)
    commands[0].options = [SimpleNamespace(name="отложить", required=False)]
    verify_postponed_commands(commands)
