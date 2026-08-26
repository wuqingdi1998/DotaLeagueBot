from pathlib import Path


MIGRATION = (
    Path(__file__).parents[1]
    / "database"
    / "migrations"
    / "0092_season_calendar_events.sql"
).read_text(encoding="utf-8")


def test_calendar_events_keep_season_date_title_color_and_editors() -> None:
    assert "season_calendar_events" in MIGRATION
    assert "season_number SMALLINT NOT NULL" in MIGRATION
    assert "event_date DATE NOT NULL" in MIGRATION
    assert "title VARCHAR(80) NOT NULL" in MIGRATION
    assert "color CHAR(7) NOT NULL" in MIGRATION
    assert "created_by BIGINT" in MIGRATION
    assert "updated_by BIGINT" in MIGRATION
