from typing import Dict, Any, List
from agents.shared.tool_runtime import run_tool

async def _optimize_route(start_location: str, visits: List[str]) -> Dict[str, Any]:
    # Mock optimization
    return {
        "start": start_location,
        "optimized_sequence": sorted(visits), # Simple sort
        "total_distance_km": 45.2,
        "estimated_time_h": 4.5
    }

async def optimize_route(start_location: str, visits: List[str]) -> Dict[str, Any]:
    return await run_tool(
        tool_name="field.optimize_route",
        handler=_optimize_route,
        payload={"start_location": start_location, "visits": visits},
        idempotent=True,
    )

async def _log_visit_report(visit_id: str, notes: str, outcome: str) -> Dict[str, Any]:
    # Mock logging
    return {
        "visit_id": visit_id,
        "status": "completed",
        "outcome": outcome,
        "sentiment": "positive" if "sold" in notes.lower() else "neutral"
    }

async def log_visit_report(visit_id: str, notes: str, outcome: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="field.log_visit_report",
        handler=_log_visit_report,
        payload={"visit_id": visit_id, "notes": notes, "outcome": outcome},
        idempotent=True,
    )

async def _check_inventory_nearby(location: str, sku: str) -> Dict[str, Any]:
    # Mock inventory
    return {
        "sku": sku,
        "location": location,
        "available_qty": 150,
        "nearest_warehouse": "WH-South"
    }

async def check_inventory_nearby(location: str, sku: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="field.check_inventory_nearby",
        handler=_check_inventory_nearby,
        payload={"location": location, "sku": sku},
        idempotent=True,
    )


async def estimate_visit_coverage(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"coverage_pct": min(100, int(context.get("coverage_pct", 84)))}


async def prioritize_daily_route(visits: List[Dict[str, Any]]) -> Dict[str, Any]:
    prioritized = sorted(visits, key=lambda item: item.get("priority", 0), reverse=True)
    return {"prioritized": prioritized}


async def summarize_visit_outcomes(outcomes: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {"completed": sum(1 for item in outcomes if item.get("status") == "completed"), "total": len(outcomes)}


async def draft_checkin_message(account: Dict[str, Any]) -> Dict[str, Any]:
    return {"message": f"Checando próximos passos com {account.get('name', 'conta')}."}
