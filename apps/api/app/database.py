from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.config import settings

_engine_kwargs: dict = {"echo": False}

if settings.database_url.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
    _engine_kwargs["poolclass"] = StaticPool
elif settings.database_url.startswith("postgresql"):
    # Public Railway Postgres URLs need SSL; internal *.railway.internal does not.
    if "railway.app" in settings.database_url and "railway.internal" not in settings.database_url:
        _engine_kwargs["connect_args"] = {"ssl": True}

engine = create_async_engine(settings.database_url, **_engine_kwargs)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
