from typing import Dict, Any, List
from agents.shared.tool_runtime import run_tool

async def _create_account_plan(account_id: str, goals: List[str]) -> Dict[str, Any]:
    # Mock plan
    return {
        "account_id": account_id,
        "vision": "Become strategic partner",
        "goals": goals,
        "revenue_target": 1000000,
        "initiatives": ["Executive Workshop", "Platform Expansion"]
    }

async def create_account_plan(account_id: str, goals: List[str]) -> Dict[str, Any]:
    return await run_tool(
        tool_name="kam.create_account_plan",
        handler=_create_account_plan,
        payload={"account_id": account_id, "goals": goals},
        idempotent=True,
    )

async def _map_stakeholders(stakeholders: List[Dict[str, str]]) -> Dict[str, Any]:
    # Mock mapping
    mapped = []
    for s in stakeholders:
        mapped.append({
            "name": s["name"],
            "role": s["role"],
            "influence": "High" if "C" in s["role"] or "VP" in s["role"] else "Medium",
            "stance": "Promoter"
        })
    return {
        "stakeholder_map": mapped,
        "coverage_gap": "Need more Engineering contacts"
    }

async def map_stakeholders(stakeholders: List[Dict[str, str]]) -> Dict[str, Any]:
    return await run_tool(
        tool_name="kam.map_stakeholders",
        handler=_map_stakeholders,
        payload={"stakeholders": stakeholders},
        idempotent=True,
    )

async def _schedule_qbr(account_id: str, contacts: List[str]) -> Dict[str, Any]:
    # Mock scheduling
    return {
        "account_id": account_id,
        "proposed_dates": ["2023-11-15", "2023-11-20"],
        "agenda": ["Review Q3", "Q4 Roadmap", "Strategic Discussion"],
        "invitees": contacts
    }

async def schedule_qbr(account_id: str, contacts: List[str]) -> Dict[str, Any]:
    return await run_tool(
        tool_name="kam.schedule_qbr",
        handler=_schedule_qbr,
        payload={"account_id": account_id, "contacts": contacts},
        idempotent=True,
    )
