import os
import json
import asyncio
from redis.asyncio import Redis

from agents.financeiro.agent import FinanceiroAgent
from agents.shared.db_pool import init_pool

QUEUE_NAME = "FINANCEIRO_QUEUE"

async def run_worker():
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_client = Redis.from_url(redis_url)

    await init_pool()

    agent = FinanceiroAgent()
    print(f"Financeiro Agent Worker started, listening on {QUEUE_NAME}...")

    while True:
        try:
            result = await redis_client.brpop(QUEUE_NAME, timeout=5)
            if result:
                _, raw_data = result
                job_data = json.loads(raw_data)
                print(f"Processing Financeiro job: {job_data.get('jobId', 'unknown')}")
                await agent.run(job_data)

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Financeiro Worker loop error: {e}")
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(run_worker())
