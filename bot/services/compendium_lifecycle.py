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


def is_ti_2026_compendium_finished(
    now: datetime.datetime | None = None,
) -> bool:
    current = now or datetime.datetime.now(MOSCOW_TIME_ZONE)
    if current.tzinfo is None:
        current = current.replace(tzinfo=MOSCOW_TIME_ZONE)
    return current.astimezone(MOSCOW_TIME_ZONE) >= TI_2026_COMPENDIUM_END_AT
