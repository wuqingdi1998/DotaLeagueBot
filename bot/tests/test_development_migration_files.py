from pathlib import Path

from database.migration_files import migration_files


def test_production_snapshot_excludes_development_only_migrations(tmp_path: Path):
    common = tmp_path / "0001_common.sql"
    common.write_text("SELECT 1;")
    development = tmp_path / "development"
    development.mkdir()
    game = development / "0194_autobattler.sql"
    game.write_text("SELECT 2;")
    archive = development / "0198_selected_archive_tournaments.sql"
    archive.write_text("SELECT 3;")
    assert migration_files(tmp_path, "ls_db") == [common]
    assert migration_files(tmp_path, "linkens_development") == [common, game, archive]
    assert migration_files(tmp_path, "linkens_development_stage_copy") == [common]


def test_fresh_dev_copy_selects_game_and_archive_migrations_again():
    directory = Path(__file__).parents[1] / "database" / "migrations"
    production = {path.name for path in migration_files(directory, "ls_db")}
    development = {path.name for path in migration_files(directory, "linkens_development")}
    development_only = {"0194_autobattler.sql", "0198_selected_archive_tournaments.sql"}
    assert production.isdisjoint(development_only)
    assert development - production == development_only
