from datetime import datetime, timezone
from types import SimpleNamespace

from services.close_announcement import (
    build_content,
    participant_entries,
    set_participant_entries,
)


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
    assert content.index("<@111> (20:05 МСК)") < content.index(
        "<@222> (20:07 МСК)"
    )


def test_legacy_close_participants_remain_visible_without_join_time() -> None:
    event = SimpleNamespace(
        participant_ids="111,222",
        participant_joined_at="",
    )

    assert participant_entries(event) == [("111", None), ("222", None)]
