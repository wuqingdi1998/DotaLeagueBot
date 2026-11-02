from pathlib import Path


def migration_files(directory: Path, database_name: str) -> list[Path]:
    """Keep dev-only migration records out of production database snapshots."""
    paths = list(directory.glob("*.sql"))
    if database_name == "linkens_development":
        paths.extend((directory / "development").glob("*.sql"))
    return sorted(paths, key=lambda path: path.name)
