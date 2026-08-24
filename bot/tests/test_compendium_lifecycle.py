import datetime

from services.compendium_lifecycle import (
    MOSCOW_TIME_ZONE,
    is_ti_2026_compendium_finished,
)


def test_ti_2026_compendium_closes_at_moscow_midnight() -> None:
    before_end = datetime.datetime(
        2026, 8, 23, 23, 59, 59, tzinfo=MOSCOW_TIME_ZONE
    )
    end = datetime.datetime(2026, 8, 24, 0, 0, tzinfo=MOSCOW_TIME_ZONE)

    assert not is_ti_2026_compendium_finished(before_end)
    assert is_ti_2026_compendium_finished(end)
