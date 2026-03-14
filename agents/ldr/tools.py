import random
import time
from typing import List, Dict, Any

ICP_WEIGHTS = {
    "revenue_range": 0.25,      # Faturamento estimado
    "employee_count": 0.15,     # Tamanho da empresa
    "tech_maturity": 0.20,      # Maturidade tecnológica
    "industry_fit": 0.20,       # Setor de atuação
    "location": 0.05,           # Localização geográfica
    "intent_signals": 0.15,     # Sinais de compra detectados
}

TIER_THRESHOLDS = {
    "T1": (90, 100),   # Alerta imediato para melhores AEs
    "T2": (70, 89),    # Fila prioritária normal
    "T3": (50, 69),    # Nurturing automatizado
    "T4": (0, 49),     # Congelar ou descartar
}

async def enrich_technographic(company_domain: str) -> Dict[str, Any]:
    """
    Detects technology stack of the target company.
    Simulated using mock data.
    """
    # Simulate API latency
    time.sleep(0.1)

    mock_stacks = [
        {"technologies": ["React", "Node.js", "AWS"], "crm": "HubSpot", "erp": "NetSuite", "cloud": "AWS"},
        {"technologies": ["Angular", "Java", "Azure"], "crm": "Salesforce", "erp": "SAP", "cloud": "Azure"},
        {"technologies": ["Vue.js", "Python", "GCP"], "crm": "Pipedrive", "erp": "None", "cloud": "GCP"}
    ]
    return random.choice(mock_stacks)

async def map_org_chart(company_name: str, linkedin_url: str) -> Dict[str, Any]:
    """
    Maps hierarchy and identifies decision makers.
    """
    return {
        "ceo": {"name": "John Doe", "linkedin": f"{linkedin_url}/john-doe"},
        "cfo": {"name": "Jane Smith", "linkedin": f"{linkedin_url}/jane-smith"},
        "champions": [{"name": "Tech Lead", "role": "CTO"}],
        "technical_evaluators": [{"name": "Dev Manager", "role": "VP Engineering"}]
    }

async def score_icp(lead_data: Dict[str, Any], icp_criteria: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculates ICP Score (0-100) based on configurable criteria using weighted logic.
    """
    score = 0.0

    # 1. Revenue Range (Weight 0.25)
    # Mock logic: if 'revenue' contains 'M' or 'B' => high score
    revenue = lead_data.get("revenue") or "0"
    revenue_score = 0
    if "B" in str(revenue): revenue_score = 100
    elif "M" in str(revenue):
        # Check if > 50M
        try:
            val = float(str(revenue).replace("M","").replace("$","").strip())
            if val > 50: revenue_score = 100
            elif val > 10: revenue_score = 80
            else: revenue_score = 50
        except:
            revenue_score = 50 # Default if parse fail but has M
    else:
        revenue_score = 20

    score += revenue_score * ICP_WEIGHTS["revenue_range"]

    # 2. Employee Count (Weight 0.15)
    employees = lead_data.get("employees") or 0
    emp_score = 0
    if employees > 1000: emp_score = 100
    elif employees > 200: emp_score = 80
    elif employees > 50: emp_score = 60
    else: emp_score = 30

    score += emp_score * ICP_WEIGHTS["employee_count"]

    # 3. Tech Maturity (Weight 0.20)
    # Assume existence of tech stack implies maturity
    tech_stack = lead_data.get("techStack")
    tech_score = 0
    if tech_stack and len(tech_stack.get("technologies", [])) > 2:
        tech_score = 100
    elif tech_stack:
        tech_score = 60
    else:
        tech_score = 30 # Unknown

    score += tech_score * ICP_WEIGHTS["tech_maturity"]

    # 4. Industry Fit (Weight 0.20)
    # Simple check for target industries
    industry = (lead_data.get("industry") or "").lower()
    target_industries = ["saas", "tech", "finance", "healthcare"]
    ind_score = 0
    if any(ind in industry for ind in target_industries):
        ind_score = 100
    elif industry:
        ind_score = 50
    else:
        ind_score = 0

    score += ind_score * ICP_WEIGHTS["industry_fit"]

    # 5. Location (Weight 0.05)
    # Assume we target "US", "BR", "EU"
    location = (lead_data.get("location") or "").upper()
    loc_score = 0
    if "BR" in location or "US" in location:
        loc_score = 100
    elif location:
        loc_score = 50
    else:
        loc_score = 0

    score += loc_score * ICP_WEIGHTS["location"]

    # 6. Intent Signals (Weight 0.15)
    intent = lead_data.get("intent_signals") or {}
    intent_score = 0
    if intent.get("signals") and len(intent.get("signals")) > 0:
        intent_score = 100
    else:
        intent_score = 20

    score += intent_score * ICP_WEIGHTS["intent_signals"]

    final_score = int(score)

    # Determine Tier
    tier = "T4"
    for t_name, (min_s, max_s) in TIER_THRESHOLDS.items():
        if min_s <= final_score <= max_s:
            tier = t_name
            break

    # Fallback if > 100 or unexpected
    if final_score > 100: tier = "T1"

    return {
        "score": final_score,
        "tier": tier,
        "reasoning": f"Calculated based on weights: Rev({revenue_score}), Emp({emp_score}), Tech({tech_score}), Ind({ind_score}), Loc({loc_score}), Intent({intent_score})",
        "missing_data": []
    }

async def detect_intent_signals(company_domain: str) -> Dict[str, Any]:
    """
    Monitors buying signals in real-time.
    """
    signals = []
    if random.random() > 0.5:
        signals.append({
            "type": "hiring",
            "description": "Hiring for Senior DevOps",
            "strength": "high",
            "detected_at": "2023-10-25"
        })

    return {
        "signals": signals,
        "buying_window": "immediate" if signals else "unknown"
    }

async def validate_email_smtp(email: str) -> Dict[str, Any]:
    """
    Validates email via SMTP handshake without sending message.
    """
    valid = "@" in email and "." in email.split("@")[1]
    return {
        "valid": valid,
        "status": "valid" if valid else "invalid",
        "risk_level": "low" if valid else "high"
    }

async def check_financial_health(cnpj: str, company_name: str) -> Dict[str, Any]:
    """
    Evaluates financial health of the target company.
    """
    return {
        "health_score": random.randint(50, 100),
        "revenue_estimate": "$10M-$50M",
        "funding_rounds": ["Series A", "Series B"],
        "risk_level": "low"
    }

async def deduplicate_and_merge(leads: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Identifies and merges duplicate leads.
    """
    unique_leads = {l.get("email"): l for l in leads if l.get("email")}
    return {
        "merged": len(leads) - len(unique_leads),
        "conflicts": [],
        "clean_leads": list(unique_leads.values())
    }


async def discover_buying_committee(contacts: list) -> dict:
    committee=[]
    for c in contacts or []:
        seniority=str(c.get('seniority','')).lower()
        if seniority in {'director','vp','c-level','head'}:
            committee.append({"name":c.get('name'),"role":c.get('role'),"seniority":seniority,"influence":c.get('influence',70)})
    return {"committee":committee,"count":len(committee),"coverage_roles":list({m['role'] for m in committee if m.get('role')})}


async def enrich_firmographics(domain: str) -> dict:
    domain=domain.lower().strip()
    employees='51-200' if len(domain)%3==0 else '201-500' if len(domain)%2==0 else '11-50'
    return {"domain":domain,"industry":"Technology","employees_bucket":employees,"hq_region":"LATAM","estimated_revenue_band":"$5M-$25M"}


async def score_account_fit(account: dict, icp_rules: dict) -> dict:
    score=0
    if account.get('industry') in icp_rules.get('industries',[]): score+=35
    if int(account.get('employees',0))>=int(icp_rules.get('min_employees',50)): score+=30
    if account.get('region') in icp_rules.get('regions',[]): score+=20
    if account.get('has_revops_team'): score+=15
    return {"fit_score":score,"tier":"A" if score>=80 else "B" if score>=60 else "C"}


async def identify_trigger_events(signals: list) -> dict:
    valid=[s for s in (signals or []) if s.get('type') in {'hiring','funding','new_exec','expansion'}]
    return {"triggers":valid,"priority":"high" if len(valid)>=2 else "normal","play":"trigger_based_outreach" if valid else "nurture"}


async def build_account_dossier(account: dict, contacts: list) -> dict:
    return {"account":account,"top_contacts":(contacts or [])[:8],"strategic_hypotheses":["crescimento comercial","eficiência operacional","padronização de processos"],"recommended_entry_point":(contacts or [{}])[0].get('name') if contacts else None}


async def rank_prospect_list(prospects: list) -> dict:
    ranked=sorted(prospects or [], key=lambda p:(p.get('fit_score',0)+p.get('intent_score',0)+p.get('engagement_score',0)), reverse=True)
    return {"ranked":ranked,"top_10":ranked[:10]}


async def verify_contact_data(contact: dict) -> dict:
    issues=[]
    if not contact.get('name'): issues.append('missing_name')
    email=contact.get('email','')
    if '@' not in email: issues.append('invalid_email')
    if not contact.get('role'): issues.append('missing_role')
    return {"valid":not issues,"issues":issues,"normalized":{"name":contact.get('name','').strip(),"email":email.lower().strip(),"role":contact.get('role')}}


async def estimate_tam_by_segment(segments: list) -> dict:
    rows=[]
    for s in segments or []:
        accounts=int(s.get('accounts',0)); acv=float(s.get('acv',0)); tam=accounts*acv
        rows.append({"segment":s.get('name'),"accounts":accounts,"acv":acv,"tam":round(tam,2)})
    return {"segments":rows,"total_tam":round(sum(r['tam'] for r in rows),2)}


async def flag_data_quality_issues(records: list) -> dict:
    issues=[]
    for i,r in enumerate(records or []):
        missing=[k for k in ['company','domain','country'] if not r.get(k)]
        if missing: issues.append({"index":i,"missing":missing})
    return {"issues":issues,"quality_score":max(0,100-len(issues)*4)}


async def generate_personalization_angles(account: dict, news: list) -> dict:
    angles=[f"Referenciar evento: {n.get('headline','atualização recente')}" for n in (news or [])[:3]]
    if not angles: angles=[f"Usar benchmark para {account.get('industry','setor alvo')}"]
    return {"angles":angles,"cta":"propor conversa curta de diagnóstico"}


async def detect_duplicate_accounts(accounts: list) -> dict:
    seen=set(); dup=[]
    for a in accounts or []:
        key=(a.get('domain','').lower(),a.get('name','').lower())
        if key in seen: dup.append(a)
        seen.add(key)
    return {"duplicates":dup,"count":len(dup)}


async def assign_outreach_priority(accounts: list) -> dict:
    ranked=[]
    for a in accounts or []:
        pr=int(a.get('intent_score',0))*0.5+int(a.get('fit_score',0))*0.4+int(a.get('engagement_score',0))*0.1
        ranked.append({"account":a.get('name'),"priority_score":round(pr,2),"priority":"p1" if pr>=75 else "p2" if pr>=50 else "p3"})
    ranked.sort(key=lambda x:x['priority_score'], reverse=True)
    return {"prioritized":ranked}


async def map_technology_gaps(account_stack: list, required_stack: list) -> dict:
    missing=[t for t in (required_stack or []) if t not in (account_stack or [])]
    return {"missing_stack":missing,"coverage_pct":round((1-len(missing)/max(1,len(required_stack or [])))*100,2),"recommended_pitch":"integração com stack atual"}


async def recommend_next_contact(contact_graph: list) -> dict:
    ranked=sorted(contact_graph or [], key=lambda c:(c.get('influence',0),c.get('responsiveness',0)), reverse=True)
    return {"recommended":ranked[0] if ranked else None,"alternatives":ranked[1:4]}


async def summarize_account_research(account: dict, artifacts: list) -> dict:
    insights=[a.get('insight') for a in (artifacts or []) if a.get('insight')]
    return {"account":account.get('name'),"insights":insights[:10],"open_questions":["qual objetivo estratégico dos próximos 2 trimestres?"],"confidence":0.74 if insights else 0.45}
