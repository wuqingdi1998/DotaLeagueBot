from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
from types import SimpleNamespace
from unittest.mock import AsyncMock

os.environ.setdefault("POSTGRES_USER", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("POSTGRES_DB", "test")

from cogs import close as close_cog
from services.close_announcement import (
    build_content,
    participant_entries,
    set_participant_entries,
)
from services.close_registration import UNSET_TIER_MESSAGE, can_register_for_close


def test_close_announcement_shows_moscow_and_local_time() -> None:
    event = SimpleNamespace(
        start_ts=int(
            datetime(2026, 7, 26, 17, 0, tzinfo=timezone.utc).timestamp()
        ),
        game_format="Captains Mode",
        series="3",
        host_id=99,
    )

    content = build_content(event, [])

    assert "В 20:00 (локальное время — <t:" in content
    assert ":t>) <t:" in content
    assert ":D> на сервере состоится клоз-матч" in content


def test_close_participants_keep_click_order_and_moscow_time() -> None:
    event = SimpleNamespace(
        start_ts=0,
        game_format="Captains Mode",
        series="1",
        host_id=99,
        participant_ids="",
        participant_joined_at="",
    )
    first_click = int(
        datetime(2026, 7, 26, 17, 5, tzinfo=timezone.utc).timestamp()
    )
    second_click = int(
        datetime(2026, 7, 26, 17, 7, tzinfo=timezone.utc).timestamp()
    )

    set_participant_entries(
        event,
        [("111", first_click), ("222", second_click)],
    )
    restored = participant_entries(event)
    content = build_content(event, restored)

    assert restored == [("111", first_click), ("222", second_click)]
    assert content.index("<@111> (20:05)") < content.index(
        "<@222> (20:07)"
    )
    assert "МСК)" not in content


def test_legacy_close_participants_remain_visible_without_join_time() -> None:
    event = SimpleNamespace(
        participant_ids="111,222",
        participant_joined_at="",
    )

    assert participant_entries(event) == [("111", None), ("222", None)]


def test_only_players_with_current_tier_can_register_for_close() -> None:
    assert can_register_for_close("current") is True
    assert can_register_for_close("outdated") is False
    assert can_register_for_close("inactive") is False
    assert can_register_for_close(None) is False


def test_unset_tier_private_message_matches_required_text() -> None:
    assert UNSET_TIER_MESSAGE == (
        "У вас не установлен серверный тир, для его получения отправьте скриншот "
        "полной страницы с актуальным MMR и последними матчами @frokeng"
    )


async def test_unset_tier_reaction_is_removed_without_registration(monkeypatch) -> None:
    event = SimpleNamespace(
        channel_id=10,
        message_id=20,
        participant_ids="",
        participant_joined_at="",
    )
    event_result = SimpleNamespace(scalar_one_or_none=lambda: event)
    tier_result = SimpleNamespace(scalar_one_or_none=lambda: "outdated")
    session = SimpleNamespace(
        execute=AsyncMock(side_effect=[event_result, tier_result]),
        commit=AsyncMock(),
    )

    @asynccontextmanager
    async def session_context():
        yield session

    monkeypatch.setattr(close_cog, "async_session", session_context)

    message = SimpleNamespace(remove_reaction=AsyncMock(), edit=AsyncMock())
    channel = SimpleNamespace(fetch_message=AsyncMock(return_value=message))
    user = SimpleNamespace(send=AsyncMock())
    bot = SimpleNamespace(
        user=SimpleNamespace(id=999),
        get_user=lambda _user_id: user,
        get_channel=lambda _channel_id: channel,
    )
    payload = SimpleNamespace(
        user_id=123,
        message_id=event.message_id,
        emoji=close_cog.CHECK_EMOJI,
        member=user,
    )

    cog = close_cog.Close(bot)
    await cog.on_raw_reaction_add(payload)

    assert event.participant_ids == ""
    session.commit.assert_not_awaited()
    message.remove_reaction.assert_awaited_once_with(close_cog.CHECK_EMOJI, user)
    message.edit.assert_not_awaited()
    user.send.assert_awaited_once_with(UNSET_TIER_MESSAGE)
