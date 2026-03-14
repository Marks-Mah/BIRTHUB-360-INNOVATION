import asyncio
from dotenv import load_dotenv

load_dotenv()

async def process_sdr_job(job_data):
    print(f"Processing SDR job: {job_data}")
    # Integration with BullMQ
    await asyncio.sleep(1)
    return {"status": "completed"}

if __name__ == "__main__":
    print("Starting SDR Worker...")
    # Loop to consume jobs
