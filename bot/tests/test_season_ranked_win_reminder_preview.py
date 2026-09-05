from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MIGRATION_PATH = (
    ROOT
    / "bot"
    / "database"
    / "migrations"
    / "0119_season_ranked_win_reminder_preview.sql"
)
DEPLOYMENT = (ROOT / ".github" / "workflows" / "deploy.yml").read_text(
    encoding="utf-8"
)


def test_ranked_win_reminder_preview_is_only_for_frokeng() -> None:
    migration = MIGRATION_PATH.read_text(encoding="utf-8")

    assert "VALUES (311247030422863882::BIGINT)" in migration
    assert "season_nine_ranked_win_reminder_preview" in migration
    assert "'cancelled'" in migration
    assert "season_round_registrations" not in migration
    assert "FROM players" not in migration


def test_ranked_win_reminder_preview_contains_requested_message() -> None:
    migration = MIGRATION_PATH.read_text(encoding="utf-8")

    assert "Привет!" in migration
    assert "[1 тур](https://lsesports.ru/tournaments/league-season-9?round=1)" in migration
    assert "не хватает **3 рейтинговых побед на основной роли**" in migration
    assert "или **2 рейтинговых побед на дополнительной роли**" in migration
    assert "Сняться без штрафа можно не позже чем за 24 часа" in migration
    assert "<@311247030422863882>" in migration


def test_deployment_delivers_and_verifies_only_the_preview() -> None:
    assert "Delivered season 9 ranked-win reminder preview to frokeng" in DEPLOYMENT
    assert "season_nine_ranked_win_reminder_preview" in DEPLOYMENT
