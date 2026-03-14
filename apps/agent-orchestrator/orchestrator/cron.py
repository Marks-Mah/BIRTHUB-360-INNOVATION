from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import asyncio
from orchestrator.flows import FLOW_BOARD_REPORT

scheduler = AsyncIOScheduler()

async def run_board_report_job():
    print(f"Running Board Report Job: {FLOW_BOARD_REPORT}")
    # Trigger the board report flow
    # await FLOW_BOARD_REPORT_GRAPH.ainvoke({})
    pass

def start_scheduler():
    # Weekly on Friday at 17:00
    scheduler.add_job(run_board_report_job, CronTrigger(day_of_week='fri', hour=17))
    scheduler.start()
    print("Scheduler started.")
