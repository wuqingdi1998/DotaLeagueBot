import os

os.environ.setdefault("POSTGRES_USER", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("POSTGRES_DB", "test")

from cogs.profile import Profile


def test_discord_profiles_are_synchronized_hourly() -> None:
    assert Profile.sync_discord_profiles_task.hours == 1


def test_opendota_rank_refresh_remains_daily() -> None:
    assert Profile.update_ranks_task.hours == 24
