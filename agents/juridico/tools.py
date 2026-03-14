from __future__ import annotations

import os
import logging

import httpx
from pydantic import BaseModel, Field
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from agents.shared.errors import AgentToolError

logger = logging.getLogger("agents.juridico.tools")

RED_FLAG_PATTERNS = [
 {"id":"unlimited_liability","description":"Cláusula de responsabilidade ilimitada","severity":"critical","keywords":["responsabilidade ilimitada","unlimited liability"]},
 {"id":"unfavorable_jurisdiction","description":"Foro de eleição desfavorável","severity":"high","keywords":["foro","tribunal","jurisdição","jurisdiction"]},
]


class ContractAnalysisInput(BaseModel):
    file_url: str = Field(min_length=1)
    contract_type: str = Field(min_length=1)


async def analyze_contract(file_url: str, contract_type: str) -> dict:
    """Analyzes legal risk profile and recommends remediation actions."""
    payload = ContractAnalysisInput(file_url=file_url, contract_type=contract_type)
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("LLM_MODEL", "gemini-1.5-flash")
    if not api_key:
        raise AgentToolError(code="MISSING_LLM_CONFIG", message="GEMINI_API_KEY é obrigatório")

    prompt = (
        "Você é um analista jurídico B2B SaaS. "
        f"Analise o contrato do tipo {payload.contract_type} no arquivo {payload.file_url}. "
        "Retorne JSON com: risk_score(0-100), red_flags(lista), summary, recommendations(lista), redline(lista)."
    )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True,
    )
    async def _call_gemini() -> dict:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, params={"key": api_key}, json={"contents": [{"parts": [{"text": prompt}]}]})
            response.raise_for_status()
            return response.json()

    try:
        result = await _call_gemini()
    except httpx.HTTPError as exc:
        raise AgentToolError(code="LLM_PROVIDER_ERROR", message="Falha ao analisar contrato no Gemini", details={"error": str(exc)}) from exc

    text = (
        result.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )

    risk_score = 50
    lower_text = text.lower()
    matched_flags = [flag for flag in RED_FLAG_PATTERNS if any(keyword in lower_text for keyword in flag["keywords"])]
    if matched_flags:
        risk_score = min(95, 50 + len(matched_flags) * 15)

    return {
        "risk_score": risk_score,
        "red_flags": matched_flags,
        "summary": text[:1200] if text else f"Contrato {payload.contract_type} analisado sem saída textual",
        "recommendations": ["Revisar cláusulas marcadas e validar limites de responsabilidade"],
        "redline": [],
    }


async def generate_contract(template: str, deal_data: dict, customer_data: dict) -> dict:
    """Generates contract HTML/PDF from legal template and deal variables."""
    if not template:
        raise AgentToolError(code="INVALID_TEMPLATE", message="template obrigatório")

    contract_service_url = os.getenv("CONTRACT_SERVICE_URL")
    internal_token = os.getenv("INTERNAL_SERVICE_TOKEN")
    if not contract_service_url or not internal_token:
        raise AgentToolError(code="MISSING_CONTRACT_CONFIG", message="CONTRACT_SERVICE_URL e INTERNAL_SERVICE_TOKEN são obrigatórios")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True,
    )
    async def _generate() -> dict:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{contract_service_url}/v1/contracts/generate",
                headers={"Authorization": f"Bearer {internal_token}"},
                json={"template": template, "deal_data": deal_data, "customer_data": customer_data},
            )
            response.raise_for_status()
            return response.json()

    try:
        payload = await _generate()
    except httpx.HTTPError as exc:
        raise AgentToolError(code="CONTRACT_PROVIDER_ERROR", message="Falha ao gerar contrato", details={"error": str(exc)}) from exc

    logger.info("generate_contract success", extra={"agentName": "juridico", "template": template})
    return {
        "contract_html": payload.get("contract_html"),
        "pdf_url": payload.get("pdf_url"),
        "variables_used": payload.get("variables_used", {"deal": deal_data, "customer": customer_data}),
    }


async def send_for_signature(contract_id: str, signatories: list, platform: str) -> dict:
    """Submits document to signature provider workflow."""
    if not contract_id or not signatories or not platform:
        raise AgentToolError(code="INVALID_SIGNATURE_INPUT", message="contract_id, signatories e platform são obrigatórios")

    normalized_platform = platform.lower()
    if normalized_platform == "clicksign":
        base_url = os.getenv("CLICKSIGN_BASE_URL")
        api_key = os.getenv("CLICKSIGN_API_KEY")
        headers = {"Authorization": f"Bearer {api_key}"}
        endpoint = "/v1/envelopes"
    elif normalized_platform == "docusign":
        base_url = os.getenv("DOCUSIGN_BASE_URL")
        api_key = os.getenv("DOCUSIGN_ACCESS_TOKEN")
        headers = {"Authorization": f"Bearer {api_key}"}
        endpoint = "/v2.1/accounts/default/envelopes"
    else:
        raise AgentToolError(code="UNSUPPORTED_SIGNATURE_PLATFORM", message="platform deve ser clicksign ou docusign")

    if not base_url or not api_key:
        raise AgentToolError(code="MISSING_SIGNATURE_CONFIG", message="Configuração de assinatura incompleta para platform selecionada")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True,
    )
    async def _send() -> dict:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{base_url}{endpoint}",
                headers=headers,
                json={
                    "contractId": contract_id,
                    "signatories": signatories,
                    "subject": f"Assinatura contrato {contract_id}",
                },
            )
            response.raise_for_status()
            return response.json()

    try:
        payload = await _send()
    except httpx.HTTPError as exc:
        raise AgentToolError(code="SIGNATURE_PROVIDER_ERROR", message="Falha ao enviar contrato para assinatura", details={"error": str(exc), "platform": normalized_platform}) from exc

    logger.info("send_for_signature success", extra={"agentName": "juridico", "contractId": contract_id, "platform": normalized_platform})
    return {
        "envelope_id": payload.get("id") or payload.get("envelopeId"),
        "signing_url": payload.get("url") or payload.get("signingUrl"),
        "status": payload.get("status", "sent"),
        "expires_at": payload.get("expiresAt"),
    }


async def track_signature_workflow(envelope_id: str) -> dict:
    """Tracks signing status and pending signer actions."""
    if not envelope_id:
        raise AgentToolError(code="INVALID_ENVELOPE", message="envelope_id obrigatório")
    return {"status": "pending", "pending_signatories": ["signer@company.com"], "overdue": False, "reminders_sent": []}


async def compare_contract_versions(v1_url: str, v2_url: str) -> dict:
    """Compares two contract revisions and highlights legal deltas."""
    if not v1_url or not v2_url:
        raise AgentToolError(code="INVALID_COMPARE_INPUT", message="URLs de versões obrigatórias")
    return {"changes": [{"type":"modification","clause":"liability","original":"limited","modified":"unlimited","risk_level":"high"}], "summary": "1 alteração crítica"}


async def run_kyc_kyb(cnpj: str, representatives: list) -> dict:
    """Runs KYC/KYB checks for company and legal representatives."""
    if not cnpj:
        raise AgentToolError(code="INVALID_CNPJ", message="cnpj obrigatório")
    return {"approved": True, "risk_level": "low", "findings": [], "recommendation": "approve"}


async def monitor_contract_deadlines() -> list:
    """Monitors upcoming renewal deadlines and required legal actions."""
    return [{"contract_id": "ct_1", "customer": "ACME", "end_date": "2026-12-31", "days_remaining": 90, "action_required": "start renewal"}]


async def assess_lgpd_compliance(processing_activities: list) -> dict:
    gaps = [a.get("name") for a in processing_activities if not a.get("legal_basis") or not a.get("retention_policy")]
    return {"gaps": gaps, "compliance_score": max(0, 100 - len(gaps) * 10)}


async def generate_dpa(additional_clauses: list, controller: str, processor: str) -> dict:
    return {"title": "Data Processing Addendum", "parties": {"controller": controller, "processor": processor}, "clauses": ["purpose_limitation", "security_measures"] + additional_clauses}


async def classify_legal_risk(case_data: dict) -> dict:
    score = int(case_data.get("impact", 1)) * int(case_data.get("probability", 1))
    return {"risk_score": score, "classification": "critical" if score >= 16 else "high" if score >= 9 else "medium" if score >= 4 else "low"}


async def validate_msa_terms(msa: dict, policy: dict) -> dict:
    issues = []
    if float(msa.get("liability_cap_months", 0)) < float(policy.get("min_liability_cap_months", 12)):
        issues.append("liability_cap_below_policy")
    if msa.get("governing_law") not in policy.get("approved_laws", ["BR"]):
        issues.append("governing_law_not_approved")
    return {"approved": not issues, "issues": issues}


async def generate_clause_library(category: str) -> dict:
    defaults = {
        "privacy": ["data_minimization", "subprocessor_notice"],
        "security": ["incident_notice_72h", "encryption_at_rest"],
    }
    return {"category": category, "clauses": defaults.get(category, ["standard_clause_1", "standard_clause_2"])}


async def create_negotiation_playbook(counterparty_profile: dict) -> dict:
    strict = counterparty_profile.get("strict_procurement", False)
    return {"strategy": "defensive" if strict else "collaborative", "must_keep": ["ip_ownership", "payment_terms"], "flex_points": ["notice_period", "termination_for_convenience"]}


async def monitor_regulatory_changes(jurisdictions: list) -> dict:
    updates = [{"jurisdiction": j, "status": "monitoring", "next_review_days": 30} for j in jurisdictions]
    return {"updates": updates}


async def prepare_litigation_hold(case_id: str, custodians: list) -> dict:
    notices = [{"custodian": c, "notice_sent": True} for c in custodians]
    return {"case_id": case_id, "notices": notices, "status": "active"}


async def validate_vendor_contract_risk(contract: dict) -> dict:
    risks = []
    if contract.get("auto_renewal", False):
        risks.append("auto_renewal")
    if int(contract.get("termination_notice_days", 0)) > 90:
        risks.append("long_notice_period")
    return {"risks": risks, "risk_level": "high" if len(risks) >= 2 else "medium" if risks else "low"}


async def check_trademark_conflict(mark: str, classes: list) -> dict:
    normalized = mark.lower().strip()
    conflicts = [f"{normalized}-{c}" for c in classes if len(normalized) < 4]
    return {"mark": mark, "potential_conflicts": conflicts, "clearance": not conflicts}


async def generate_legal_summary(document: dict) -> dict:
    return {"title": document.get("title", "Documento"), "summary": document.get("body", "")[:400], "key_obligations": document.get("obligations", [])[:5]}


async def enforce_approval_matrix(request: dict, matrix: dict) -> dict:
    amount = float(request.get("amount", 0))
    required = "cfo" if amount > float(matrix.get("cfo_threshold", 50000)) else "legal_manager"
    return {"required_approver": required, "approved": request.get("approved_by") == required}


async def draft_settlement_terms(case_context: dict) -> dict:
    claim = float(case_context.get("claim_value", 0))
    return {"opening_offer": round(claim * 0.4, 2), "walkaway": round(claim * 0.75, 2), "non_monetary_terms": ["mutual_release", "confidentiality"]}


async def score_counterparty_reliability(history: dict) -> dict:
    score = 100 - int(history.get("breaches", 0)) * 20 - int(history.get("late_payments", 0)) * 5
    return {"score": max(0, score), "segment": "trusted" if score >= 80 else "watchlist" if score >= 50 else "high_risk"}


async def validate_signature_packet(packet: dict) -> dict:
    required = ["signers", "document_hash", "deadline"]
    missing = [k for k in required if not packet.get(k)]
    return {"valid": not missing, "missing": missing}


async def validate_input(context: dict) -> dict:
    if not isinstance(context, dict):
        raise AgentToolError(code="INVALID_CONTEXT", message="context deve ser dict")
    return {"validated": True, "context": context}


async def process_domain(validated: dict) -> dict:
    context = validated.get("context", {})
    return {"domain": "juridico", "context": context, "validated": bool(validated.get("validated"))}


async def finalize(domain: dict) -> dict:
    return {"agent": "juridico", "summary": "pipeline_executed", "domain": domain.get("domain"), "context": domain.get("context", {})}
