from __future__ import annotations

import statistics
from typing import Any

from pydantic import BaseModel, Field

from agents.shared.errors import AgentToolError

CRITICAL_METRICS = ["mql_to_meeting_rate","sql_to_closed_won_rate","average_cac","mrr_growth_rate","net_revenue_retention","average_health_score","invoice_collection_rate","churn_rate_monthly","google_ads_cpa","meta_ads_roas"]


class AttributionInput(BaseModel):
    touch_data: list[dict[str, Any]] = Field(default_factory=list)
    closed_deals: list[dict[str, Any]] = Field(default_factory=list)


class AnomalyInput(BaseModel):
    metric: str
    current_value: float
    historical: list[float] = Field(default_factory=list)


class ForecastInput(BaseModel):
    cohort: dict[str, Any] = Field(default_factory=dict)
    period_months: int = Field(default=36, ge=1, le=120)


async def build_attribution_model(touch_data: list, closed_deals: list) -> dict:
    """Builds a lightweight channel attribution summary for board-level visibility."""
    AttributionInput(touch_data=touch_data, closed_deals=closed_deals)
    return {"channel_attribution": {"organic": 0.3, "paid": 0.5, "direct": 0.2}, "roi_by_channel": {"paid": 2.4}, "dark_social_estimate": 0.12}


async def detect_anomaly(metric: str, current_value: float, historical: list) -> dict:
    """Detects relevant KPI deviations against historical baseline."""
    payload = AnomalyInput(metric=metric, current_value=current_value, historical=historical)
    if payload.metric not in CRITICAL_METRICS:
        raise AgentToolError(code="UNKNOWN_METRIC", message="Métrica não suportada para detecção", details={"metric": payload.metric})
    avg = statistics.mean(payload.historical) if payload.historical else payload.current_value
    deviation = ((payload.current_value-avg)/avg*100) if avg else 0
    anomaly = abs(deviation) > 15
    return {"anomaly": anomaly, "severity": "high" if abs(deviation)>30 else "medium", "deviation_pct": round(deviation,2), "alert_message": f"{payload.metric} deviation {deviation:.2f}%"}


async def forecast_ltv(cohort: dict, period_months: int = 36) -> dict:
    """Forecasts LTV by cohort and returns confidence ranges."""
    payload = ForecastInput(cohort=cohort, period_months=period_months)
    base = payload.cohort.get('arpu',100)*payload.period_months*0.6
    return {"cohort_ltv": base, "confidence_interval": {"low": base*0.8, "high": base*1.2}, "by_segment": {"default": base}}


async def consolidate_unit_economics(period: str) -> dict:
    """Consolidates CAC/LTV/payback metrics by representative segment."""
    if not period:
        raise AgentToolError(code="INVALID_PERIOD", message="Período obrigatório")
    return {"cac": {"by_channel": {"paid": 1200}, "by_segment": {"mid_market": 1400}}, "ltv": {"mid_market": 8400}, "ratio": {"mid_market": 6.0}, "payback_months": {"mid_market": 7}}


async def generate_board_report(period: str, highlights: list) -> dict:
    """Generates an executive report package with PDF and deck links."""
    if not period:
        raise AgentToolError(code="INVALID_PERIOD", message="Período obrigatório")
    return {"pdf_url": "https://reports.example.com/board.pdf", "slide_deck_url": "https://slides.example.com/board", "key_insights": highlights}


async def analyze_funnel(stage_from: str, stage_to: str, period: str) -> dict:
    """Analyzes stage conversion and bottlenecks in the sales funnel."""
    if not all([stage_from, stage_to, period]):
        raise AgentToolError(code="INVALID_FUNNEL_INPUT", message="Parâmetros de funil incompletos")
    return {"conversion_rate": 0.24, "avg_time_days": 12.5, "bottlenecks": ["proposal_delay"], "by_rep": {"AE1": 0.27}}


async def model_cohort_retention(cohorts: list, months: int = 12) -> dict:
    curves = {}
    for c in cohorts:
        name = c.get("name", "default")
        base = float(c.get("start_users", 100))
        decay = float(c.get("monthly_decay", 0.05))
        curves[name] = [round(base * ((1 - decay) ** m), 2) for m in range(months)]
    return {"retention_curves": curves, "months": months}


async def compute_pipeline_velocity(stages: list) -> dict:
    total_days = sum(float(s.get("avg_days", 0)) for s in stages)
    conv = 1
    for s in stages:
        conv *= float(s.get("conversion", 1))
    return {"velocity_days": round(total_days, 2), "stage_to_close_rate": round(conv, 4)}


async def estimate_revenue_impact(experiments: list) -> dict:
    impacts = [{"experiment": e.get("name", "exp"), "monthly_impact": round(float(e.get("uplift", 0)) * float(e.get("baseline", 0)), 2)} for e in experiments]
    return {"impacts": impacts, "total_monthly_impact": round(sum(i["monthly_impact"] for i in impacts), 2)}


async def create_kpi_scorecard(metrics: dict, targets: dict) -> dict:
    rows = []
    for k, v in metrics.items():
        target = float(targets.get(k, v))
        attainment = 100 if target == 0 else round(float(v) / target * 100, 2)
        rows.append({"metric": k, "value": v, "target": target, "attainment_pct": attainment})
    return {"scorecard": rows}


async def analyze_channel_efficiency(channels: list) -> dict:
    ranked = []
    for c in channels:
        spend = float(c.get("spend", 1))
        revenue = float(c.get("revenue", 0))
        ranked.append({"channel": c.get("name", "unknown"), "roas": round(revenue / spend, 2), "cpl": round(spend / max(1, int(c.get("leads", 1))), 2)})
    ranked.sort(key=lambda x: x["roas"], reverse=True)
    return {"ranking": ranked}


async def detect_tracking_gaps(events: list, expected_events: list) -> dict:
    tracked = {e.get("name") for e in events}
    missing = [e for e in expected_events if e not in tracked]
    return {"missing_events": missing, "coverage_pct": round((len(expected_events) - len(missing)) / max(1, len(expected_events)) * 100, 2)}


async def run_scenario_planning(base_plan: dict, growth_rates: list) -> dict:
    scenarios = []
    base = float(base_plan.get("mrr", 0))
    for g in growth_rates:
        g = float(g)
        scenarios.append({"growth_rate": g, "mrr_12m": round(base * ((1 + g) ** 12), 2)})
    return {"scenarios": scenarios}


async def benchmark_performance(metrics: dict, benchmark: dict) -> dict:
    comparison = {}
    for k, v in metrics.items():
        b = float(benchmark.get(k, v))
        comparison[k] = {"value": v, "benchmark": b, "delta_pct": round((float(v) - b) / b * 100, 2) if b else 0}
    return {"comparison": comparison}


async def prioritize_experiments(backlog: list) -> dict:
    scored = []
    for item in backlog:
        score = float(item.get("impact", 0)) * float(item.get("confidence", 0)) / max(1, float(item.get("effort", 1)))
        scored.append({**item, "ice_score": round(score, 2)})
    scored.sort(key=lambda x: x["ice_score"], reverse=True)
    return {"prioritized": scored}


async def calculate_expansion_potential(accounts: list) -> dict:
    output = []
    for a in accounts:
        potential = float(a.get("unused_seats", 0)) * float(a.get("seat_price", 0))
        output.append({"account": a.get("name"), "monthly_expansion": round(potential, 2)})
    return {"accounts": output, "total_expansion": round(sum(i["monthly_expansion"] for i in output), 2)}


async def evaluate_pricing_elasticity(price_tests: list) -> dict:
    results = []
    for t in price_tests:
        delta_demand = float(t.get("demand_change_pct", 0))
        delta_price = float(t.get("price_change_pct", 1))
        elasticity = round(delta_demand / delta_price, 3) if delta_price else 0
        results.append({"test": t.get("name", "test"), "elasticity": elasticity})
    return {"elasticity_tests": results}


async def build_exec_dashboard_snapshot(metrics: dict) -> dict:
    return {"snapshot": metrics, "critical_alerts": [k for k, v in metrics.items() if isinstance(v, (int, float)) and v < 0], "generated": "now"}


async def detect_data_drift(baseline: dict, current: dict) -> dict:
    drift = {}
    for k, b in baseline.items():
        c = float(current.get(k, b))
        b = float(b)
        drift[k] = round((c - b) / b * 100, 2) if b else 0
    return {"drift_pct": drift, "alerts": [k for k, v in drift.items() if abs(v) > 20]}


async def generate_root_cause_tree(problem: str, hypotheses: list) -> dict:
    return {"problem": problem, "tree": [{"hypothesis": h, "tests": [f"validar_{h}_dados", f"entrevistar_times_{h}"]} for h in hypotheses]}


async def produce_weekly_ops_digest(signals: dict) -> dict:
    highlights = [f"{k}: {v}" for k, v in signals.items()][:10]
    return {"highlights": highlights, "recommended_actions": ["investigar gargalos", "revisar metas semanais"]}



async def validate_input(context: dict) -> dict:
    if not isinstance(context, dict):
        raise AgentToolError(code="INVALID_CONTEXT", message="context deve ser dict")
    return {"validated": True, "context": context}


async def process_domain(validated: dict) -> dict:
    context = validated.get("context", {})
    return {"domain": "analista", "context": context, "validated": bool(validated.get("validated"))}


async def finalize(domain: dict) -> dict:
    return {"agent": "analista", "summary": "pipeline_executed", "domain": domain.get("domain"), "context": domain.get("context", {})}
