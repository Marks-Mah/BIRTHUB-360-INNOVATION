from typing import Dict, Any, List
from agents.shared.tool_runtime import run_tool

async def _clean_crm_data(lead_id: str) -> Dict[str, Any]:
    # Mock cleaning
    return {
        "lead_id": lead_id,
        "cleaned_fields": ["phone_format", "title_normalization"],
        "status": "enriched"
    }

async def clean_crm_data(lead_id: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="sales_ops.clean_crm_data",
        handler=_clean_crm_data,
        payload={"lead_id": lead_id},
        idempotent=True,
    )

async def _forecast_revenue(pipeline_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    # Mock forecast
    total_value = sum(d.get("value", 0) for d in pipeline_data)
    weighted_value = sum(d.get("value", 0) * d.get("probability", 0) for d in pipeline_data)
    return {
        "total_pipeline": total_value,
        "weighted_forecast": weighted_value,
        "period": "Q3"
    }

async def forecast_revenue(pipeline_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    return await run_tool(
        tool_name="sales_ops.forecast_revenue",
        handler=_forecast_revenue,
        payload={"pipeline_data": pipeline_data},
        idempotent=True,
    )

async def _assign_leads(lead_ids: List[str], rules: Dict[str, Any]) -> Dict[str, Any]:
    # Mock assignment
    assignments = {}
    reps = ["Rep A", "Rep B", "Rep C"]
    for i, lead_id in enumerate(lead_ids):
        assignments[lead_id] = reps[i % len(reps)]
    return {
        "assignments": assignments,
        "method": rules.get("method", "round_robin")
    }


async def assign_leads(lead_ids: List[str], rules: Dict[str, Any]) -> Dict[str, Any]:
    return await run_tool(
        tool_name="sales_ops.assign_leads",
        handler=_assign_leads,
        payload={"lead_ids": lead_ids, "rules": rules},
        idempotent=True,
    )


async def audit_crm_hygiene(context: Dict[str, Any]) -> Dict[str, Any]:
    score = min(100, max(0, int(context.get("lead_score", 75))))
    return {
        "score": score,
        "issues": [] if score >= 80 else ["missing_owner", "stale_stage"],
    }


async def generate_ops_backlog(context: Dict[str, Any]) -> Dict[str, Any]:
    base_value = float(context.get("base_value", 0))
    confidence = float(context.get("confidence", 0.7))
    return {
        "projected_value": round(base_value * confidence, 2),
        "items": ["limpeza_crm", "padronizar_campos", "automatizar_handoffs"],
    }


async def score_process_automation_readiness(context: Dict[str, Any]) -> Dict[str, Any]:
    standardization = float(context.get("standardization", 0))
    data_quality = float(context.get("data_quality", 0))
    readiness = round((standardization + data_quality) / 2, 2)
    return {"readiness": readiness, "band": "high" if readiness >= 80 else "medium" if readiness >= 60 else "low"}
async def normalize_pipeline_fields(context: Dict[str, Any]) -> Dict[str, Any]:
    required = ["owner", "stage", "amount", "close_date"]
    available = context.get("fields", required)
    missing = [field for field in required if field not in available]
    return {"missing": missing, "compliant": len(missing) == 0}


async def calculate_sla_compliance(context: Dict[str, Any]) -> Dict[str, Any]:
    on_time = int(context.get("on_time", 80))
    total = max(1, int(context.get("total", 100)))
    return {"compliance": round(on_time / total, 4)}


async def detect_duplicate_records(context: Dict[str, Any]) -> Dict[str, Any]:
    records = context.get("records", [])
    unique = len({str(r.get("email", r.get("id", idx))) for idx, r in enumerate(records)})
    return {"duplicates": max(0, len(records) - unique)}


async def estimate_admin_load(context: Dict[str, Any]) -> Dict[str, Any]:
    tickets = int(context.get("tickets", 20))
    avg_minutes = int(context.get("avg_minutes", 25))
    return {"hours": round((tickets * avg_minutes) / 60, 2)}


async def prioritize_ops_automation(context: Dict[str, Any]) -> Dict[str, Any]:
    initiatives = context.get("initiatives", ["sync_crm", "alertas_sla", "higienizacao"])
    return {"priority": sorted(initiatives), "count": len(initiatives)}


async def build_weekly_ops_report(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"sections": ["qualidade_dados", "sla", "backlog", "automacoes"], "week": context.get("week", "current")}
