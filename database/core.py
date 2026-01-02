from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from database.models import Base

# Connection string for SQLite.
# In production, this will be replaced with PostgreSQL.
DB_URL = "sqlite+aiosqlite:///league.db"

# Create the async engine.
# echo=True enables SQL logging in console (disable in production).
engine = create_async_engine(DB_URL, echo=True)

# Session factory for interaction with the DB in other parts of the app.
async_session = async_sessionmaker(engine, expire_on_commit=False)

async def init_db():
    """
    Initializes the database.
    Creates tables defined in models.py if they do not exist.
    """
    async with engine.begin() as conn:
        # Create all tables inheriting from Base
        await conn.run_sync(Base.metadata.create_all)
        print("[DATABASE] Schema initialized and tables checked.")