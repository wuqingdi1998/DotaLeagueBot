import os
from sqlalchemy import URL
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from database.models import Base
from dotenv import load_dotenv

load_dotenv()

user = os.getenv("POSTGRES_USER")
password = os.getenv("POSTGRES_PASSWORD")
db_name = os.getenv("POSTGRES_DB")
host = os.getenv("POSTGRES_HOST", "localhost")
port = int(os.getenv("POSTGRES_PORT", "5432"))
debug_mode = os.getenv("DEBUG", "False").lower() == "true"

missing_settings = [
    name
    for name, value in (
        ("POSTGRES_USER", user),
        ("POSTGRES_PASSWORD", password),
        ("POSTGRES_DB", db_name),
    )
    if not value
]
if missing_settings:
    raise RuntimeError(
        f"Missing database settings: {', '.join(missing_settings)}"
    )

DATABASE_URL = URL.create(
    drivername="postgresql+asyncpg",
    username=user,
    password=password,
    host=host,
    port=port,
    database=db_name,
)

engine = create_async_engine(DATABASE_URL, echo=debug_mode)

async_session = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[DATABASE] PostgreSQL connected and tables created.")
