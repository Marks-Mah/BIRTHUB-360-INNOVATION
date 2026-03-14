import pytest

from agents.shared.rate_limiter import RateLimiter


class FakePipeline:
    def __init__(self, count: int):
        self.count = count

    def zremrangebyscore(self, *_args):
        return self

    def zadd(self, *_args):
        return self

    def zcard(self, *_args):
        return self

    def expire(self, *_args):
        return self

    async def execute(self):
        return [0, 1, self.count, 1]


class FakeRedis:
    def __init__(self, count: int = 0, fail: bool = False):
        self.count = count
        self.fail = fail

    async def ping(self):
        if self.fail:
            raise RuntimeError("down")

    def pipeline(self):
        if self.fail:
            raise RuntimeError("pipeline down")
        return FakePipeline(self.count)

    async def zremrangebyscore(self, *_args):
        return 0

    async def zcard(self, *_args):
        if self.fail:
            raise RuntimeError("zcard down")
        return self.count


@pytest.mark.asyncio
async def test_check_and_increment_allows_when_under_limit():
    limiter = RateLimiter("redis://fake", 60, 5)
    limiter._redis = FakeRedis(count=3)
    allowed, count = await limiter.check_and_increment("tenant:agent")
    assert allowed is True
    assert count == 3


@pytest.mark.asyncio
async def test_check_and_increment_blocks_when_limit_reached():
    limiter = RateLimiter("redis://fake", 60, 5)
    limiter._redis = FakeRedis(count=6)
    allowed, count = await limiter.check_and_increment("tenant:agent")
    assert allowed is False
    assert count == 6


@pytest.mark.asyncio
async def test_fail_open_when_client_unavailable():
    limiter = RateLimiter("", 60, 5)
    allowed, count = await limiter.check_and_increment("tenant:agent")
    assert allowed is True
    assert count == 0


@pytest.mark.asyncio
async def test_get_remaining_returns_delta():
    limiter = RateLimiter("redis://fake", 60, 10)
    limiter._redis = FakeRedis(count=4)
    remaining = await limiter.get_remaining("tenant:agent")
    assert remaining == 6


@pytest.mark.asyncio
async def test_get_remaining_fail_open():
    limiter = RateLimiter("redis://fake", 60, 10)
    limiter._redis = FakeRedis(count=4, fail=True)
    remaining = await limiter.get_remaining("tenant:agent")
    assert remaining == 10
