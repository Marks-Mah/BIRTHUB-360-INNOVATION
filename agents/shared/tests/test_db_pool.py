import pytest
from agents.shared import db_pool
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_get_pool_raises_before_init(monkeypatch):
    monkeypatch.setattr(db_pool, "_pool", None)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="Pool not initialized"):
        await db_pool.get_pool()

@pytest.mark.asyncio
async def test_init_pool_creates_pool(monkeypatch):
    created = object()

    # Mock create_pool
    # db_pool.asyncpg might be mocked by conftest if missing, or real asyncpg if present.
    # We should set create_pool on whatever db_pool.asyncpg is.
    if hasattr(db_pool.asyncpg, "create_pool"):
        monkeypatch.setattr(db_pool.asyncpg, "create_pool", AsyncMock(return_value=created))
    else:
        # If asyncpg is a mock object itself (from conftest)
        db_pool.asyncpg.create_pool = AsyncMock(return_value=created)

    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/test")
    monkeypatch.setattr(db_pool, "_pool", None)

    pool = await db_pool.init_pool()
    assert pool is created
    assert db_pool._pool is created

@pytest.mark.asyncio
async def test_get_pool_lazy_init(monkeypatch):
    created = object()
    if hasattr(db_pool.asyncpg, "create_pool"):
        monkeypatch.setattr(db_pool.asyncpg, "create_pool", AsyncMock(return_value=created))
    else:
        db_pool.asyncpg.create_pool = AsyncMock(return_value=created)

    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/test")
    monkeypatch.setattr(db_pool, "_pool", None)

    pool = await db_pool.get_pool()
    assert pool is created
    assert db_pool._pool is created

@pytest.mark.asyncio
async def test_close_pool_resets_global_pool(monkeypatch):
    class DummyPool:
        def __init__(self) -> None:
            self.closed = False

        async def close(self) -> None:
            self.closed = True

    dummy_pool = DummyPool()
    monkeypatch.setattr(db_pool, "_pool", dummy_pool)

    await db_pool.close_pool()

    assert dummy_pool.closed is True
    assert db_pool._pool is None
