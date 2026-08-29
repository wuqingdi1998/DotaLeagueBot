from datetime import datetime, timezone


PROFILE_CHANGE_POLICY_VERSION = 1
PROFILE_CHANGE_LIMIT = 1
PROFILE_CHANGES_UNLIMITED_UNTIL = datetime(
    2026,
    9,
    6,
    7,
    0,
    tzinfo=timezone.utc,
)


def profile_changes_are_unlimited(now: datetime | None = None) -> bool:
    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)
    return current_time < PROFILE_CHANGES_UNLIMITED_UNTIL
