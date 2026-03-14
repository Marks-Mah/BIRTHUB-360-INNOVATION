from __future__ import annotations

import os
import math
import logging
from urllib.parse import urlencode

import httpx
from pydantic import BaseModel, Field
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from agents.shared.errors import AgentToolError

logger = logging.getLogger("agents.marketing.tools")


class AdCopyInput(BaseModel):
    platform: str = Field(min_length=1)
    audience: str = Field(min_length=1)
    goal: str = Field(min_length=1)
    tone: str = Field(min_length=1)


async def generate_ad_copy(platform: str, audience: str, goal: str, tone: str) -> dict:
    """Generates paid-media copy variants aligned to campaign objective."""
    payload = AdCopyInput(platform=platform, audience=audience, goal=goal, tone=tone)
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("LLM_MODEL", "gemini-1.5-flash")
    if not api_key:
        raise AgentToolError(code="MISSING_LLM_CONFIG", message="GEMINI_API_KEY é obrigatório")

    prompt = (
        f"Crie copy de anúncio para {payload.platform}. Público: {payload.audience}. "
        f"Objetivo: {payload.goal}. Tom: {payload.tone}. "
        "Retorne JSON com headline, description, cta, variations(lista de 3)."
    )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True,
    )
    async def _call_llm() -> dict:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                params={"key": api_key},
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
            response.raise_for_status()
            return response.json()

    try:
        response = await _call_llm()
    except httpx.HTTPError as exc:
        raise AgentToolError(code="LLM_PROVIDER_ERROR", message="Falha ao gerar copy", details={"error": str(exc)}) from exc

    text = (
        response.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )
    headline = text.split("\n")[0][:120] if text else f"{payload.goal} para {payload.audience}"
    return {
        "headline": headline,
        "description": text[:240] if text else f"Campanha em {payload.platform} com tom {payload.tone}",
        "cta": "Solicite uma demo",
        "variations": [headline, f"{headline} - Variante B", f"{headline} - Variante C"],
    }


async def generate_seo_brief(topic: str, competitors: list, sales_call_insights: str) -> dict:
    """Builds SEO brief from topic, SERP competitors and call insights."""
    if not topic:
        raise AgentToolError(code="INVALID_TOPIC", message="topic obrigatório")
    return {"title": f"Guia completo: {topic}", "h1": topic, "meta_description": f"Como dominar {topic}", "outline": ["Contexto", "Estratégia", "Execução"], "keywords": [topic, *competitors[:2]], "difficulty_score": 62}


async def repurpose_content(source_content: str, formats: list[str]) -> dict:
    """Repurposes source content into requested distribution formats."""
    if not source_content:
        raise AgentToolError(code="INVALID_SOURCE_CONTENT", message="source_content obrigatório")
    return {fmt: f"{fmt}: {source_content[:120]}" for fmt in formats}


async def run_ab_test_analysis(test_id: str, variants: list, metrics: dict) -> dict:
    """Evaluates A/B test variants and selects winner by metric score."""
    if not test_id:
        raise AgentToolError(code="INVALID_TEST_ID", message="test_id obrigatório")
    if len(variants) < 2:
        raise AgentToolError(code="INVALID_VARIANTS", message="É necessário ao menos 2 variantes")

    sample_a = metrics.get(variants[0], [])
    sample_b = metrics.get(variants[1], [])
    if not isinstance(sample_a, list) or not isinstance(sample_b, list) or not sample_a or not sample_b:
        raise AgentToolError(code="INVALID_METRICS", message="metrics deve conter listas não vazias por variante")

    def _welch_normal_pvalue(a: list[float], b: list[float]) -> float:
        mean_a = sum(a) / len(a)
        mean_b = sum(b) / len(b)
        var_a = sum((x - mean_a) ** 2 for x in a) / max(1, len(a) - 1)
        var_b = sum((x - mean_b) ** 2 for x in b) / max(1, len(b) - 1)
        denom = math.sqrt((var_a / len(a)) + (var_b / len(b)))
        if denom == 0:
            return 1.0
        z = abs(mean_a - mean_b) / denom
        # aproximação bicaudal normal: p = erfc(z / sqrt(2))
        return max(0.0, min(1.0, math.erfc(z / math.sqrt(2))))

    try:
        from scipy.stats import ttest_ind  # type: ignore

        stat = ttest_ind(sample_a, sample_b, equal_var=False)
        p_value = float(stat.pvalue)
    except ModuleNotFoundError:
        # Fallback estatístico aproximado (Welch + normal) quando scipy não está disponível.
        p_value = _welch_normal_pvalue([float(x) for x in sample_a], [float(x) for x in sample_b])
    mean_a = sum(sample_a) / len(sample_a)
    mean_b = sum(sample_b) / len(sample_b)
    winner = variants[0] if mean_a >= mean_b else variants[1]
    confidence = round(1 - min(0.999, max(0.0, p_value)), 4)

    return {
        "winner": winner,
        "confidence": confidence,
        "p_value": p_value,
        "recommendation": "Escalar vencedor" if p_value < 0.05 else "Continuar experimento",
        "traffic_split": {v: round(100 / len(variants), 2) for v in variants},
    }


async def optimize_budget(campaigns: list, total_budget: float, period: str) -> dict:
    """Optimizes budget allocation across campaigns for target period."""
    if total_budget <= 0:
        raise AgentToolError(code="INVALID_BUDGET", message="total_budget deve ser >= 0")
    if not period:
        raise AgentToolError(code="INVALID_PERIOD", message="period obrigatório")

    optimizer_url = os.getenv("MARKETING_OPTIMIZER_URL")
    optimizer_api_key = os.getenv("MARKETING_OPTIMIZER_API_KEY")
    if not optimizer_url or not optimizer_api_key:
        raise AgentToolError(code="MISSING_OPTIMIZER_CONFIG", message="MARKETING_OPTIMIZER_URL e MARKETING_OPTIMIZER_API_KEY são obrigatórios")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True,
    )
    async def _optimize() -> dict:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{optimizer_url}/v1/budget/optimize",
                headers={"Authorization": f"Bearer {optimizer_api_key}"},
                json={"campaigns": campaigns, "total_budget": total_budget, "period": period},
            )
            response.raise_for_status()
            return response.json()

    try:
        payload = await _optimize()
    except httpx.HTTPError as exc:
        raise AgentToolError(code="OPTIMIZER_PROVIDER_ERROR", message="Falha ao otimizar orçamento", details={"error": str(exc)}) from exc

    reallocations = payload.get("reallocations")
    if not isinstance(reallocations, list):
        raise AgentToolError(code="INVALID_OPTIMIZER_RESPONSE", message="Resposta do otimizador inválida")

    logger.info("optimize_budget success", extra={"agentName": "marketing", "period": period, "campaignCount": len(campaigns)})
    return {"reallocations": reallocations}


async def generate_utm_tags(campaign: dict) -> dict:
    """Builds normalized UTM parameters and final campaign URL."""
    if "url" not in campaign:
        raise AgentToolError(code="INVALID_CAMPAIGN", message="campaign.url obrigatório")
    params = {"utm_source": campaign.get("source","unknown"), "utm_medium": campaign.get("medium","paid"), "utm_campaign": campaign.get("name","campaign"), "utm_content": campaign.get("content","default"), "utm_term": campaign.get("term","b2b")}
    final_url = f"{campaign.get('url','https://example.com')}?{urlencode(params)}"
    return {**params, "final_url": final_url}


async def create_retargeting_segment(behavior_rules: dict) -> dict:
    """Creates retargeting segment estimates from behavioral criteria."""
    score = len(behavior_rules) * 120
    return {"segment_id": f"seg_{score}", "audience_size": score, "estimated_cpm": 18.5}


async def build_campaign_brief(objective: str, audience: dict, offer: dict) -> dict:
    return {"objective": objective, "persona": audience.get("persona", "b2b_buyers"), "pain_points": audience.get("pain_points", []), "offer": offer, "channels": ["linkedin", "google", "email"]}


async def generate_content_calendar(topics: list, weeks: int = 4) -> dict:
    if weeks < 1:
        raise AgentToolError(code="INVALID_WEEKS", message="weeks deve ser >= 1")
    planner_url = os.getenv("CONTENT_PLANNER_URL")
    planner_api_key = os.getenv("CONTENT_PLANNER_API_KEY")
    if not planner_url or not planner_api_key:
        raise AgentToolError(code="MISSING_CONTENT_PLANNER_CONFIG", message="CONTENT_PLANNER_URL e CONTENT_PLANNER_API_KEY são obrigatórios")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True,
    )
    async def _plan() -> dict:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{planner_url}/v1/content/calendar",
                headers={"Authorization": f"Bearer {planner_api_key}"},
                json={"topics": topics, "weeks": weeks},
            )
            response.raise_for_status()
            return response.json()

    try:
        payload = await _plan()
    except httpx.HTTPError as exc:
        raise AgentToolError(code="CONTENT_PLANNER_PROVIDER_ERROR", message="Falha ao gerar calendário de conteúdo", details={"error": str(exc)}) from exc

    calendar = payload.get("calendar")
    if not isinstance(calendar, list):
        raise AgentToolError(code="INVALID_CONTENT_CALENDAR_RESPONSE", message="Resposta inválida do planner de conteúdo")

    logger.info("generate_content_calendar success", extra={"agentName": "marketing", "weeks": weeks, "items": len(calendar)})
    return {"calendar": calendar}


async def score_creative_fatigue(ad_metrics: list) -> dict:
    fatigued = []
    for ad in ad_metrics:
        ctr_drop = float(ad.get("ctr_drop_pct", 0))
        freq = float(ad.get("frequency", 0))
        if ctr_drop > 20 and freq > 3:
            fatigued.append({"ad_id": ad.get("ad_id"), "severity": "high"})
    return {"fatigued_ads": fatigued}


async def suggest_budget_reallocation(campaigns: list, increment: float = 0.1) -> dict:
    sorted_campaigns = sorted(campaigns, key=lambda c: c.get("roas", 0), reverse=True)
    recommendations = []
    for idx, c in enumerate(sorted_campaigns):
        change = increment if idx < 2 else -increment / 2
        recommendations.append({"campaign": c.get("name"), "budget_change_pct": round(change * 100, 2)})
    return {"recommendations": recommendations}


async def generate_landing_page_outline(offer: dict, persona: str) -> dict:
    return {"headline": f"{offer.get('title', 'Solução')} para {persona}", "sections": ["dor", "prova", "como_funciona", "cta"], "cta": "Solicitar demonstração"}


async def evaluate_message_market_fit(feedback: list) -> dict:
    positives = sum(1 for f in feedback if f.get("sentiment") == "positive")
    total = max(1, len(feedback))
    return {"fit_score": round(positives / total * 100, 2), "sample_size": len(feedback)}


async def cluster_keywords_by_intent(keywords: list) -> dict:
    clusters = {"informational": [], "commercial": [], "transactional": []}
    for kw in keywords:
        term = kw.lower()
        if "como" in term or "o que" in term:
            clusters["informational"].append(kw)
        elif "preço" in term or "plano" in term:
            clusters["transactional"].append(kw)
        else:
            clusters["commercial"].append(kw)
    return {"clusters": clusters}


async def create_webinar_plan(topic: str, target_accounts: list) -> dict:
    return {"topic": topic, "agenda": ["contexto", "demo", "q&a"], "invite_list": target_accounts, "follow_up": ["enviar gravação", "agendar call"]}


async def compute_pipeline_contribution(touches: list, opportunities: list) -> dict:
    influenced = {o.get("id") for o in opportunities if o.get("touches", 0) > 0}
    return {"influenced_opportunities": len(influenced), "touches": len(touches)}


async def generate_social_snippets(content: str, channels: list) -> dict:
    snippets = {c: f"{content[:120]}... #{c}" for c in channels}
    return {"snippets": snippets}


async def detect_brand_voice_deviation(texts: list, brand_rules: dict) -> dict:
    forbidden = set(brand_rules.get("forbidden_terms", []))
    violations = []
    for idx, t in enumerate(texts):
        if any(term in t.lower() for term in forbidden):
            violations.append({"index": idx, "issue": "forbidden_term"})
    return {"violations": violations, "compliant": not violations}


async def plan_abn_journey(accounts: list, stages: list) -> dict:
    journeys = []
    for acc in accounts:
        journeys.append({"account": acc.get("name"), "stages": [{"stage": s, "asset": f"asset_{s}"} for s in stages]})
    return {"journeys": journeys}


async def estimate_event_roi(event_cost: float, pipeline_created: float, win_rate: float) -> dict:
    expected_revenue = pipeline_created * win_rate
    roi = ((expected_revenue - event_cost) / event_cost * 100) if event_cost else 0
    return {"expected_revenue": round(expected_revenue, 2), "roi_pct": round(roi, 2)}


async def generate_email_nurture_flow(persona: str, offer: str, steps: int = 5) -> dict:
    flow = [{"step": i + 1, "subject": f"{persona}: {offer} - etapa {i + 1}", "goal": "educar" if i < steps - 1 else "converter"} for i in range(steps)]
    return {"flow": flow}


async def analyze_organic_growth_signals(traffic: list) -> dict:
    growth = []
    for idx in range(1, len(traffic)):
        prev, curr = float(traffic[idx - 1]), float(traffic[idx])
        growth.append(round((curr - prev) / prev * 100, 2) if prev else 0)
    return {"month_over_month_growth": growth, "avg_growth": round(sum(growth) / max(1, len(growth)), 2)}


async def validate_input(context: dict) -> dict:
    if not isinstance(context, dict):
        raise AgentToolError(code="INVALID_CONTEXT", message="context deve ser dict")
    return {"validated": True, "context": context}


async def process_domain(validated: dict) -> dict:
    context = validated.get("context", {})
    return {"domain": "marketing", "context": context, "validated": bool(validated.get("validated"))}


async def finalize(domain: dict) -> dict:
    return {"agent": "marketing", "summary": "pipeline_executed", "domain": domain.get("domain"), "context": domain.get("context", {})}
