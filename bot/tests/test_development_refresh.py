import importlib.util
import json
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import uuid

import pytest


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts/refresh-development-data.py"
SPEC = importlib.util.spec_from_file_location("development_refresh", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


@pytest.mark.parametrize("name", ["postgres", "main", "live", "linkens_development; DROP DATABASE live", "linkens_development_backup_.."])
def test_refresh_rejects_every_non_development_database_identifier(name):
    with pytest.raises(RuntimeError, match="isolated development"):
        MODULE.database_identifier(name)


def test_refresh_paths_cannot_escape_the_development_workspace(tmp_path):
    with pytest.raises(RuntimeError, match="stay inside"):
        MODULE.child_path(tmp_path / ".." / "outside", tmp_path)
    with pytest.raises(RuntimeError, match="stay inside"):
        MODULE.child_path(tmp_path, tmp_path)


def test_refresh_rejects_an_unisolated_target_before_any_write(tmp_path, monkeypatch):
    production, development = tmp_path / "DotaLeagueBot", tmp_path / "DotaLeagueBotDev"
    monkeypatch.setattr(MODULE, "configuration", lambda *_: {"services": {
        "db": {"environment": {"POSTGRES_DB": "live", "POSTGRES_USER": "live"}},
        "development-site": {"environment": {"SITE_ENVIRONMENT": "production"}},
    }})
    monkeypatch.setattr(subprocess, "run", lambda *_args, **_kwargs: pytest.fail("No write is allowed"))
    with pytest.raises(RuntimeError, match="not isolated"):
        MODULE.refresh(production, development, "release")


def test_main_release_refresh_is_gated_by_successful_production_and_preserves_new_work():
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text(encoding="utf-8")
    development_job = workflow.split("\n  development:", 1)[1]
    assert "needs: [validate, deploy]" in development_job
    assert "needs.deploy.result == 'success'" in development_job
    assert "inputs.bootstrap_development" not in development_job
    assert "bash scripts/deploy-development.sh --refresh-from-production" in development_job
    assert "git merge-base --is-ancestor HEAD origin/codex/dev" in development_job
    assert "--force" not in development_job
    deployment = (ROOT / "scripts/deploy-development.sh").read_text(encoding="utf-8")
    assert 'test "$production_revision" = "$revision"' in deployment
    assert 'if [ "$refresh_mode" = --refresh-from-production ] || [ ! -f development/initialized ]' in deployment


def test_recovery_retention_keeps_two_copies_and_never_removes_unverified_folders(tmp_path):
    root = tmp_path / "development/refresh"
    root.mkdir(parents=True)
    for number in range(4):
        path = root / ("2026102912000" + str(number) + "abcdef")
        path.mkdir()
        if number < 3:
            (path / "verified.json").write_text("{}", encoding="utf-8")
    calls = []

    class Target:
        def sql(self, statement, database):
            calls.append((statement, database))

    MODULE.prune_recovery_copies(Target(), tmp_path)
    assert len(list(root.iterdir())) == 3
    assert (root / "20261029120003abcdef").is_dir()
    assert calls == [('DROP DATABASE IF EXISTS "linkens_development_backup_20261029120000abcdef";', "postgres")]


@pytest.fixture
def isolated_databases(tmp_path):
    if sys.platform != "linux":
        pytest.skip("The production refresh integration runs against Linux Docker in GitHub")
    assert shutil.which("docker"), "Linux validation requires Docker"
    subprocess.run(["docker", "info"], check=True, capture_output=True, timeout=20)

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            payload = {"ok": True} if self.path == "/api/health" else {"revision": "verified-release"}
            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode())

        def log_message(self, *_args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    production, development = tmp_path / "DotaLeagueBot", tmp_path / "DotaLeagueBotDev"
    pair = []
    previous_alarm_handler = signal.getsignal(signal.SIGALRM)

    def timeout_refresh(_signum, _frame):
        raise TimeoutError("Development refresh integration exceeded its time limit")
    for directory, filename, database, site_name in [
        (production, "docker-compose.yml", "production_example", "site"),
        (development, "docker-compose.development.yml", "linkens_development", "development-site"),
    ]:
        directory.mkdir()
        config = {"name": "refresh_test_" + uuid.uuid4().hex[:12], "services": {
            "db": {"image": "postgres:15-alpine", "environment": {
                "POSTGRES_DB": database, "POSTGRES_USER": database, "POSTGRES_PASSWORD": "only-test-data",
            }, "healthcheck": {"test": ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"], "interval": "1s", "timeout": "3s", "retries": 30}},
            site_name: {"image": "postgres:15-alpine", "environment": {
                "PUBLIC_BASE_URL": f"http://127.0.0.1:{server.server_port}", "SITE_ENVIRONMENT": "development",
            }},
        }}
        (directory / filename).write_text(json.dumps(config), encoding="utf-8")
        database_client = MODULE.Database(directory, filename, config["services"]["db"]["environment"])
        pair.append(database_client)
    try:
        for database in pair:
            subprocess.run([*database.compose, "up", "-d", "--wait", "db"], cwd=database.root, check=True, timeout=120)
        source, target = pair
        for database, tier in [(source, 8), (target, 7)]:
            database.sql(f"""
                CREATE TABLE players(id bigserial PRIMARY KEY, tier integer);
                INSERT INTO players(tier) VALUES ({tier});
                CREATE TABLE cup_constructor_boards(id integer PRIMARY KEY, board jsonb);
                INSERT INTO cup_constructor_boards VALUES (1, '{{"ready": {str(tier == 7).lower()}, "slots": [1,null,2]}}');
                CREATE SCHEMA history;
                CREATE TABLE history.matches(id integer REFERENCES public.players(id), score text);
                INSERT INTO history.matches VALUES (1, '2:0');
            """)
            for table in MODULE.SESSION_TABLES:
                database.sql(f"CREATE TABLE {table}(token text); INSERT INTO {table} VALUES ('never-copy-this-session');")
        target.sql("CREATE TABLE test_only_draft(value text); INSERT INTO test_only_draft VALUES ('experiment');")
        (production / "uploads_data").mkdir()
        (production / "uploads_data" / "main.txt").write_text("working file", encoding="utf-8")
        (development / "development" / "uploads").mkdir(parents=True)
        (development / "development" / "uploads" / "trial.txt").write_text("test file", encoding="utf-8")
        signal.signal(signal.SIGALRM, timeout_refresh)
        signal.alarm(180)
        yield source, target
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, previous_alarm_handler)
        for database in pair:
            subprocess.run([*database.compose, "down", "--volumes"], cwd=database.root, check=True, timeout=60)
        server.shutdown()
        server.server_close()
        worker.join()


def test_refresh_copies_main_values_files_and_schema_without_importing_test_data(isolated_databases):
    source, target = isolated_databases
    main_before = source.fingerprint(source.name)
    report = MODULE.refresh(source.root, target.root, "verified-release")
    assert source.fingerprint(source.name) == main_before
    assert target.fingerprint(target.name) == main_before
    assert target.sql("SELECT tier FROM players") == "8"
    assert target.sql("SELECT board->>'ready' FROM cup_constructor_boards") == "false"
    assert target.sql("SELECT to_regclass('test_only_draft') IS NULL") == "t"
    for table in MODULE.SESSION_TABLES:
        assert target.sql(f"SELECT COUNT(*) FROM {table}") == "0"
        assert source.sql(f"SELECT COUNT(*) FROM {table}") == "1"
    uploads = target.root / "development/uploads"
    assert sorted(path.name for path in uploads.iterdir()) == ["main.txt"]
    assert target.sql("SELECT tier FROM players", report["backupDatabase"]) == "7"
    target.sql("UPDATE players SET tier = 6")
    MODULE.refresh(source.root, target.root, "verified-release")
    assert target.sql("SELECT tier FROM players") == "8", "Every completed publication must refresh trials again"
    assert source.fingerprint(source.name) == main_before


def test_failed_file_activation_restores_the_old_development_copy(isolated_databases, monkeypatch):
    source, target = isolated_databases
    main_before = source.fingerprint(source.name)
    test_before = target.fingerprint(target.name)
    rename = Path.rename

    def fail_staged_uploads(path, destination):
        if path.name == "uploads" and re.fullmatch(r"\d{14}[a-f0-9]{6}", path.parent.name):
            raise OSError("Simulated upload activation failure")
        return rename(path, destination)

    monkeypatch.setattr(Path, "rename", fail_staged_uploads)
    with pytest.raises(OSError, match="activation failure"):
        MODULE.refresh(source.root, target.root, "verified-release")
    assert target.fingerprint(target.name) == test_before
    assert target.sql("SELECT tier FROM players") == "7"
    assert (target.root / "development/uploads/trial.txt").read_text(encoding="utf-8") == "test file"
    assert source.fingerprint(source.name) == main_before
