import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from database.models import Base
from dotenv import load_dotenv

load_dotenv()

user = os.getenv("POSTGRES_USER")
password = os.getenv("POSTGRES_PASSWORD")
db_name = os.getenv("POSTGRES_DB")
host = os.getenv("POSTGRES_HOST", "localhost")
debug_mode = os.getenv("DEBUG", "False").lower() == "true"


DATABASE_URL = f"postgresql+asyncpg://{user}:{password}@{host}/{db_name}"

engine = create_async_engine(DATABASE_URL, echo=debug_mode)

async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[DATABASE] PostgreSQL connected and tables created.")