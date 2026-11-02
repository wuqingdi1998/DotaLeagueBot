from pathlib import Path

from database.migration_files import migration_files


def test_production_snapshot_does_not_record_game_migration(tmp_path: Path):
    common = tmp_path / "0001_common.sql"
    common.write_text("SELECT 1;")
    development = tmp_path / "development"
    development.mkdir()
    game = development / "0194_autobattler.sql"
    game.write_text("SELECT 2;")
    assert migration_files(tmp_path, "ls_db") == [common]
    assert migration_files(tmp_path, "linkens_development") == [common, game]
    assert migration_files(tmp_path, "linkens_development_stage_copy") == [common]


def test_fresh_dev_copy_selects_game_migration_again():
    directory = Path(__file__).parents[1] / "database" / "migrations"
    production = {path.name for path in migration_files(directory, "ls_db")}
    development = {path.name for path in migration_files(directory, "linkens_development")}
    assert "0194_autobattler.sql" not in production
    assert development - production == {"0194_autobattler.sql"}
