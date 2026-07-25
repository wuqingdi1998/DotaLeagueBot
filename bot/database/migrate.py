from __future__ import annotations

import asyncio
import hashlib
import os
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

from database.core import engine
from database.models import Base

MIGRATION_LOCK_ID = 729_412_853


def build_database_url() -> str:
    explicit_url = os.getenv("DATABASE_URL")
    if explicit_url:
        return explicit_url.replace("postgresql+asyncpg://", "postgresql://", 1)

    required = ("POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB")
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        raise RuntimeError(f"Missing database settings: {', '.join(missing)}")

    user = os.environ["POSTGRES_USER"]
    password = os.environ["POSTGRES_PASSWORD"]
    database = os.environ["POSTGRES_DB"]
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"


async def run_migrations() -> None:
    load_dotenv()
    async with engine.begin() as sqlalchemy_connection:
        await sqlalchemy_connection.run_sync(Base.metadata.create_all)
    await engine.dispose()

    connection = await asyncpg.connect(build_database_url())
    migrations_dir = Path(__file__).with_name("migrations")
    try:
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                name TEXT PRIMARY KEY,
                checksum TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        await connection.execute("SELECT pg_advisory_lock($1)", MIGRATION_LOCK_ID)
        for path in sorted(migrations_dir.glob("*.sql")):
            sql = path.read_text(encoding="utf-8")
            checksum = hashlib.sha256(sql.encode("utf-8")).hexdigest()
            row = await connection.fetchrow(
                "SELECT checksum FROM schema_migrations WHERE name = $1", path.name
            )
            if row:
                if row["checksum"] != checksum:
                    raise RuntimeError(
                        f"Migration {path.name} was changed after it was applied"
                    )
                continue
            async with connection.transaction():
                await connection.execute(sql)
                await connection.execute(
                    "INSERT INTO schema_migrations(name, checksum) VALUES ($1, $2)",
                    path.name,
                    checksum,
                )
            print(f"[DATABASE] Applied migration {path.name}")
    finally:
        await connection.execute("SELECT pg_advisory_unlock($1)", MIGRATION_LOCK_ID)
        await connection.close()


if __name__ == "__main__":
    asyncio.run(run_migrations())
