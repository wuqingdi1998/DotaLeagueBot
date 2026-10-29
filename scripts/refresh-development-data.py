"""Replace only the isolated development data with a verified, read-only live snapshot."""

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import urllib.request
import uuid


DEVELOPMENT_DATABASE = "linkens_development"
SESSION_TABLES = (
    "web_sessions", "web_organizer_sessions", "temporary_organizer_passwords",
    "web_organizer_login_attempts",
)
FINGERPRINT_SQL = r"""
SELECT format(
  'SELECT json_build_object(''table'', %L, ''rows'', COUNT(*), ''checksum'',
    md5(COALESCE(string_agg(row_hash, '''' ORDER BY row_hash COLLATE "C"), '''')))
   FROM (SELECT md5(to_jsonb(record)::text) AS row_hash FROM %I.%I record) records;',
  schemaname || '.' || tablename, schemaname, tablename)
FROM pg_tables
WHERE schemaname NOT LIKE 'pg_%%' AND schemaname <> 'information_schema'
  AND NOT (schemaname = 'public' AND tablename IN (
    'web_sessions', 'web_organizer_sessions', 'temporary_organizer_passwords',
    'web_organizer_login_attempts'))
ORDER BY schemaname, tablename
\gexec
"""


def child_path(path: Path, parent: Path) -> Path:
    resolved = path.resolve()
    if not resolved.is_relative_to(parent.resolve()) or resolved == parent.resolve():
        raise RuntimeError("Refresh path must stay inside the development workspace")
    return resolved


def configuration(root: Path, filename: str) -> dict:
    return json.loads(subprocess.check_output(
        ["docker", "compose", "-f", filename, "config", "--format", "json"],
        cwd=root, text=True,
    ))


class Database:
    def __init__(self, root: Path, filename: str, settings: dict):
        self.root = root
        self.compose = ["docker", "compose", "-f", filename]
        self.name = settings["POSTGRES_DB"]
        self.user = settings["POSTGRES_USER"]

    def command(self, *arguments: str) -> list[str]:
        return [*self.compose, "exec", "-T", "db", *arguments]

    def psql_command(self, database: str | None = None) -> list[str]:
        return self.command("psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", self.user, "-d", database or self.name)

    def sql(self, statement: str, database: str | None = None) -> str:
        return subprocess.check_output(self.psql_command(database), cwd=self.root, input=statement, text=True).strip()

    def fingerprint(self, database: str) -> list[dict]:
        output = self.sql("BEGIN READ ONLY; SET LOCAL TIME ZONE 'UTC';\n" + FINGERPRINT_SQL + "\nCOMMIT;", database)
        return [json.loads(line) for line in output.splitlines() if line]


@contextmanager
def live_snapshot(source: Database):
    process = subprocess.Popen(source.psql_command(), cwd=source.root, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    assert process.stdin and process.stdout
    try:
        process.stdin.write("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSET LOCAL TIME ZONE 'UTC'; SET LOCAL statement_timeout = '120s';\nSELECT pg_export_snapshot();\n")
        process.stdin.flush()
        snapshot = process.stdout.readline().strip()
        if not re.fullmatch(r"[0-9A-Fa-f]+-[0-9A-Fa-f]+-\d+", snapshot):
            raise RuntimeError("Unable to obtain a consistent read-only production snapshot")
        process.stdin.write(FINGERPRINT_SQL + "\nSELECT 'FINGERPRINT_DONE';\n")
        process.stdin.flush()
        fingerprints = []
        for line in process.stdout:
            if line.strip() == "FINGERPRINT_DONE":
                break
            fingerprints.append(json.loads(line))
        else:
            raise RuntimeError("Production snapshot verification failed")
        yield snapshot, fingerprints
    finally:
        if process.poll() is None:
            try:
                process.communicate("ROLLBACK;\n", timeout=30)
            except subprocess.TimeoutExpired:
                process.kill()
                process.communicate()
        if process.returncode:
            raise RuntimeError("Read-only production snapshot connection failed")


def uploads_fingerprint(root: Path) -> dict[str, str]:
    result = {}
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise RuntimeError("Upload snapshots must not contain symbolic links")
        if path.is_file():
            with path.open("rb") as stream:
                digest = hashlib.sha256()
                for block in iter(lambda: stream.read(1024 * 1024), b""):
                    digest.update(block)
                result[path.relative_to(root).as_posix()] = digest.hexdigest()
    return result


def database_identifier(name: str) -> str:
    if not re.fullmatch(r"linkens_development(?:_(?:stage|backup)_[a-z0-9]+)?", name):
        raise RuntimeError("Only the isolated development database can be replaced")
    return '"' + name + '"'


def rename_database(target: Database, old: str, new: str) -> None:
    old_identifier, new_identifier = database_identifier(old), database_identifier(new)
    target.sql(f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{old}' AND pid <> pg_backend_pid();", "postgres")
    target.sql(f"ALTER DATABASE {old_identifier} RENAME TO {new_identifier};", "postgres")


def verify_live(base_url: str, revision: str) -> None:
    for path in ("health", "version"):
        with urllib.request.urlopen(base_url.rstrip("/") + "/api/" + path, timeout=30) as response:
            result = json.load(response)
        if (path == "health" and result.get("ok") is not True) or (path == "version" and result.get("revision") != revision):
            raise RuntimeError("Production must be healthy at the published revision before refreshing development")


def prune_recovery_copies(target: Database, development: Path) -> None:
    root = child_path(development / "development" / "refresh", development)
    copies = sorted(path for path in root.iterdir() if not path.is_symlink()
                    and re.fullmatch(r"\d{14}[a-f0-9]{6}", path.name)
                    and (path / "verified.json").is_file())
    for path in copies[:-2]:
        directory = child_path(path, root)
        backup_name = DEVELOPMENT_DATABASE + "_backup_" + directory.name
        target.sql(f"DROP DATABASE IF EXISTS {database_identifier(backup_name)};", "postgres")
        shutil.rmtree(directory)


def refresh(production: Path, development: Path, revision: str) -> dict:
    production, development = production.resolve(), development.resolve()
    if production.name != "DotaLeagueBot" or development != production.parent / "DotaLeagueBotDev":
        raise RuntimeError("Refresh requires separate production and development workspaces")
    source_config = configuration(production, "docker-compose.yml")
    target_config = configuration(development, "docker-compose.development.yml")
    target_settings = target_config["services"]["db"]["environment"]
    site_settings = target_config["services"]["development-site"]["environment"]
    if target_settings["POSTGRES_DB"] != DEVELOPMENT_DATABASE or target_settings["POSTGRES_USER"] != DEVELOPMENT_DATABASE or site_settings["SITE_ENVIRONMENT"] != "development":
        raise RuntimeError("Refusing to refresh a database that is not isolated development")
    verify_live(source_config["services"]["site"]["environment"]["PUBLIC_BASE_URL"], revision)
    source = Database(production, "docker-compose.yml", source_config["services"]["db"]["environment"])
    target = Database(development, "docker-compose.development.yml", target_settings)
    source_container = subprocess.check_output([*source.compose, "ps", "-q", "db"], cwd=production, text=True).strip()
    target_container = subprocess.check_output([*target.compose, "ps", "-q", "db"], cwd=development, text=True).strip()
    if not source_container or not target_container or source_container == target_container:
        raise RuntimeError("Production and development must use different database services")
    if target.sql("SELECT current_database();") != DEVELOPMENT_DATABASE:
        raise RuntimeError("Unexpected development database connection")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S") + uuid.uuid4().hex[:6]
    folder = child_path(development / "development" / "refresh" / stamp, development)
    folder.mkdir(parents=True, mode=0o700)
    folder.chmod(0o700)
    stage_name = DEVELOPMENT_DATABASE + "_stage_" + stamp
    backup_name = DEVELOPMENT_DATABASE + "_backup_" + stamp
    dump = folder / "production.dump"
    source_uploads = production / "uploads_data"
    if source_uploads.is_symlink() or not source_uploads.is_dir():
        raise RuntimeError("Production uploads must be an ordinary directory")
    if (development / "development" / "uploads").is_symlink():
        raise RuntimeError("Development uploads must not be a symbolic link")
    uploads = child_path(development / "development" / "uploads", development)
    staged_uploads = child_path(folder / "uploads", development)
    backup_uploads = child_path(folder / "previous-uploads", development)
    with live_snapshot(source) as (snapshot, expected):
        with dump.open("wb") as output:
            subprocess.run(source.command("pg_dump", "-U", source.user, "-d", source.name,
                           "--format=custom", "--no-owner", "--no-acl", "--snapshot=" + snapshot), cwd=production, stdout=output, check=True)
    before_files = uploads_fingerprint(source_uploads)
    shutil.copytree(source_uploads, staged_uploads, symlinks=True)
    if uploads_fingerprint(staged_uploads) != before_files or uploads_fingerprint(source_uploads) != before_files:
        raise RuntimeError("Uploads changed during the snapshot; the existing development copy was preserved")
    target.sql(f"CREATE DATABASE {database_identifier(stage_name)} TEMPLATE template0;", "postgres")
    with dump.open("rb") as input_file:
        subprocess.run(target.command("pg_restore", "-U", target.user, "-d", stage_name, "--no-owner", "--no-acl", "--exit-on-error", "--single-transaction"), cwd=development, stdin=input_file, check=True)
    target.sql("TRUNCATE " + ", ".join(SESSION_TABLES) + ";", stage_name)
    if target.fingerprint(stage_name) != expected:
        raise RuntimeError("Restored development data differs from the production snapshot")
    subprocess.run([*target.compose, "stop", "development-site"], cwd=development, check=True)
    is_database_backed_up = False
    is_database_switched = False
    is_uploads_backed_up = False
    report = {"productionRevision": revision, "database": DEVELOPMENT_DATABASE,
              "backupDatabase": backup_name, "tables": expected, "uploads": before_files,
              "clearedSessionTables": list(SESSION_TABLES)}
    try:
        rename_database(target, DEVELOPMENT_DATABASE, backup_name)
        is_database_backed_up = True
        rename_database(target, stage_name, DEVELOPMENT_DATABASE)
        is_database_switched = True
        uploads.rename(backup_uploads)
        is_uploads_backed_up = True
        staged_uploads.rename(uploads)
        if target.fingerprint(DEVELOPMENT_DATABASE) != expected or uploads_fingerprint(uploads) != before_files:
            raise RuntimeError("Development activation verification failed")
        (folder / "verified.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        marker = folder / "last-refresh.json"
        marker.write_text(json.dumps(report, ensure_ascii=False) + "\n", encoding="utf-8")
        dump.unlink()
        marker.replace(development / "development" / "last-refresh.json")
    except BaseException:
        if is_uploads_backed_up:
            if uploads.exists():
                uploads.rename(child_path(folder / "failed-uploads", development))
            backup_uploads.rename(uploads)
        if is_database_switched:
            rename_database(target, DEVELOPMENT_DATABASE, stage_name)
        if is_database_backed_up:
            rename_database(target, backup_name, DEVELOPMENT_DATABASE)
        subprocess.run([*target.compose, "start", "development-site"], cwd=development, check=False)
        raise
    print(f"Development refreshed from {revision[:8]}: {len(expected)} tables and {len(before_files)} uploads verified; previous data retained for recovery")
    try:
        prune_recovery_copies(target, development)
    except (OSError, RuntimeError, subprocess.CalledProcessError):
        print("Refresh verified; older recovery copies were preserved because automatic cleanup could not complete")
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--production-dir", type=Path, required=True)
    parser.add_argument("--production-revision", required=True)
    arguments = parser.parse_args()
    refresh(arguments.production_dir, Path.cwd(), arguments.production_revision)


if __name__ == "__main__":
    main()
