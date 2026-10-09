from __future__ import annotations

import datetime


MOSCOW_TIME_ZONE = datetime.timezone(
    datetime.timedelta(hours=3),
    name="Europe/Moscow",
)
TI_2026_COMPENDIUM_END_AT = datetime.datetime(
    2026,
    8,
    24,
    0,
    0,
    tzinfo=MOSCOW_TIME_ZONE,
)
TI_2026_COMPENDIUM_FINISHED_MESSAGE = (
    "Компендиум TI 2026 завершён. Задания и начисление звёзд остановлены."
)
CURRENT_COMPENDIUM_START_AT = datetime.datetime(2026, 10, 5, tzinfo=MOSCOW_TIME_ZONE)
CURRENT_COMPENDIUM_END_AT = datetime.datetime(2026, 10, 26, tzinfo=MOSCOW_TIME_ZONE)
CURRENT_COMPENDIUM_UNAVAILABLE_MESSAGE = (
    "Октябрьский компендиум доступен с 5 по 25 октября 2026 по московскому времени."
)


def is_current_compendium_active(now: datetime.datetime | None = None) -> bool:
    current = now or datetime.datetime.now(MOSCOW_TIME_ZONE)
    if current.tzinfo is None:
        current = current.replace(tzinfo=MOSCOW_TIME_ZONE)
    return CURRENT_COMPENDIUM_START_AT <= current < CURRENT_COMPENDIUM_END_AT


def is_ti_2026_compendium_finished(
    now: datetime.datetime | None = None,
) -> bool:
    current = now or datetime.datetime.now(MOSCOW_TIME_ZONE)
    if current.tzinfo is None:
        current = current.replace(tzinfo=MOSCOW_TIME_ZONE)
    return current.astimezone(MOSCOW_TIME_ZONE) >= TI_2026_COMPENDIUM_END_AT
