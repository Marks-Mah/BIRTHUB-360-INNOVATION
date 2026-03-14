import os
import logging
import asyncio
import asyncpg
from typing import Optional

logger = logging.getLogger("DBPool")

_pool: Optional[asyncpg.Pool] = None
_lock = asyncio.Lock()

async def init_pool(dsn: Optional[str] = None) -> asyncpg.Pool:
    global _pool
    if _pool is not None:
        logger.warning("DB Pool already initialized, returning existing pool.")
        return _pool

    database_url = dsn or os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is not set")

    try:
        logger.info("Initializing DB Pool...")
        # Note: We are not using the lock here because init_pool might be called explicitly.
        # Use get_pool for thread-safe access if lazy loading.
        _pool = await asyncpg.create_pool(
            dsn=database_url,
            min_size=2,
            max_size=10,
            command_timeout=5.0,
            statement_cache_size=100,
        )
        logger.info("DB Pool initialized successfully")
        return _pool # type: ignore
    except Exception as e:
        logger.error(f"Failed to initialize DB Pool: {e}")
        raise

async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        async with _lock:
            if _pool is None:
                if os.getenv("DATABASE_URL"):
                     logger.info("Lazy initializing DB Pool...")
                     await init_pool()
                else:
                     raise RuntimeError("Pool not initialized and DATABASE_URL not set.")

    if _pool is None:
         raise RuntimeError("Pool failed to initialize.")

    return _pool

async def close_pool() -> None:
    global _pool
    if _pool is not None:
        logger.info("Closing DB Pool...")
        await _pool.close()
        _pool = None
        logger.info("DB Pool closed")
