async def calculate_health_score(customer_id: str, telemetry: dict) -> dict:
    score = max(0, min(100, int(telemetry.get('login_frequency', 50))))
    status = 'healthy' if score >= 70 else 'at_risk'
    return {"score": score, "status": status, "risk_factors": [], "playbook": "customer_recovery" if score < 70 else "growth"}

async def generate_onboarding_trail(user: dict, product: str) -> dict:
    return {"steps": ["kickoff", "setup", "first-value"], "email_sequence": [f"Bem-vindo ao {product}"], "in_app_hints": ["Conecte integração principal"], "target_aha_moment": "Primeiro resultado em 7 dias"}

async def predict_churn_risk(customer: dict, behavior_history: dict) -> dict:
    risk = round(min(1, behavior_history.get('payment_delays',0)*0.1 + behavior_history.get('login_drop',0)*0.01),2)
    return {"risk_score": risk, "risk_category": "high" if risk>0.7 else "medium" if risk>0.4 else "low", "playbook": "salvage", "urgency": "high" if risk>0.7 else "normal"}

async def detect_upsell_opportunity(customer: dict, usage_data: dict) -> dict:
    return {"opportunities": [{"type":"seat_expansion","trigger":"90% de uso","recommended_plan":"Enterprise","draft_email":"Podemos expandir sua operação?"}]}

async def analyze_nps_response(response: dict) -> dict:
    score = response.get('score',0)
    category = 'promoter' if score>=9 else 'passive' if score>=7 else 'detractor'
    return {"category": category, "sentiment": "positive" if category=='promoter' else "negative" if category=='detractor' else "neutral", "next_action": "open_crisis_ticket" if category=='detractor' else "ask_referral", "draft_message": "Obrigado pelo feedback"}

async def generate_renewal_campaign(customer: dict, days_before: int = 90) -> dict:
    return {"roi_report": "ROI consolidado do período", "email_sequence": ["Resumo de resultados", "Próximos ganhos"], "renewal_date": customer.get('renewal_date','2026-01-01')}

async def deflect_support_ticket(ticket_content: str, knowledge_base: list) -> dict:
    return {"deflected": bool(knowledge_base), "solution": knowledge_base[0] if knowledge_base else "", "article_url": "https://kb.example.com/article", "confidence": 0.71 if knowledge_base else 0.2}


async def build_success_plan(customer: dict, objectives: list) -> dict:
    plan=[]
    for o in objectives or []:
        plan.append({"objective":o,"owner":customer.get('csm','csm_owner'),"metric":f"kpi_{str(o).lower().replace(' ','_')}","target_date":"30_days"})
    return {"customer_id":customer.get('id'),"plan":plan,"review_cadence":"biweekly"}


async def orchestrate_qbr(customer: dict, period_metrics: dict) -> dict:
    return {"customer":customer.get('name'),"agenda":["objetivos","valor_gerado","riscos","plano_próximo_trimestre"],"metrics":period_metrics,"required_attendees":["sponsor","ops_lead","csm"]}


async def calculate_adoption_index(usage: dict) -> dict:
    active=float(usage.get('active_users',0)); licensed=max(1.0,float(usage.get('licensed_users',1))); depth=float(usage.get('feature_depth',0.5)); frequency=float(usage.get('weekly_usage_rate',0.5))
    index=round((active/licensed)*50 + depth*30 + frequency*20,2)
    return {"adoption_index":index,"tier":"high" if index>=75 else "medium" if index>=55 else "low"}


async def detect_training_needs(team_usage: list) -> dict:
    needs=[]
    for t in team_usage or []:
        if float(t.get('completion_rate',1))<0.75 or float(t.get('error_rate',0))>0.1:
            needs.append({"team":t.get('team'),"reason":"low_completion_or_high_error"})
    return {"teams_needing_training":needs,"count":len(needs)}


async def generate_expansion_playbook(account: dict, opportunities: list) -> dict:
    plays=[]
    for o in opportunities or []:
        plays.append({"opportunity":o.get('type'),"value":o.get('value',0),"next_step":"executive_alignment","owner":account.get('csm','csm_owner')})
    return {"account":account.get('name'),"playbook":plays}


async def monitor_sla_breach_risk(tickets: list) -> dict:
    risks=[t for t in (tickets or []) if float(t.get('hours_to_sla',999))<4]
    return {"at_risk_tickets":risks,"risk_count":len(risks),"recommended_action":"escalate_hot_queue" if risks else "monitor"}


async def design_advocacy_program(promoters: list) -> dict:
    return {"candidates":[p.get('account') for p in (promoters or [])],"tracks":["case_study","event_speaker","review_site","referral"],"incentives":["co_marketing","early_access"]}


async def compute_renewal_probability(account: dict, signals: dict) -> dict:
    prob=0.5
    prob+=0.2 if signals.get('high_adoption') else 0
    prob+=0.15 if signals.get('exec_sponsor') else 0
    prob-=0.25 if signals.get('open_escalations') else 0
    prob-=0.15 if signals.get('budget_risk') else 0
    prob=max(0,min(1,prob))
    return {"renewal_probability":round(prob,2),"category":"secure" if prob>=0.75 else "watch" if prob>=0.5 else "risk"}


async def summarize_customer_voice(feedback_items: list) -> dict:
    themes={}
    for f in feedback_items or []:
        th=f.get('theme','geral'); themes[th]=themes.get(th,0)+1
    top=max(themes,key=themes.get) if themes else None
    return {"themes":themes,"top_theme":top,"sample_size":len(feedback_items or [])}


async def automate_playbook_assignment(accounts: list) -> dict:
    assignments=[]
    for a in accounts or []:
        h=float(a.get('health',100)); play='recovery' if h<60 else 'adoption' if h<80 else 'expansion'
        assignments.append({"account":a.get('name'),"playbook":play})
    return {"assignments":assignments}


async def map_customer_stakeholders(stakeholders: list) -> dict:
    mapped=[{"name":s.get('name'),"role":s.get('role'),"influence":s.get('influence',50),"sentiment":s.get('sentiment','neutral')} for s in (stakeholders or [])]
    return {"stakeholders":mapped,"champion":next((m for m in mapped if m.get('sentiment')=='positive'),None)}


async def recommend_enablement_assets(use_cases: list) -> dict:
    return {"assets":{u:[f"playbook_{u}",f"video_{u}",f"checklist_{u}"] for u in (use_cases or [])}}


async def build_escalation_plan(incident: dict, stakeholders: list) -> dict:
    sev=incident.get('severity','medium')
    timeline=["t+0 triagem","t+1h plano","t+4h atualização"] if sev=='high' else ["t+0 triagem","t+8h atualização","t+24h resolução"]
    return {"incident_id":incident.get('id'),"severity":sev,"timeline":timeline,"owners":stakeholders}


async def estimate_customer_lifetime_value(account: dict) -> dict:
    mrr=float(account.get('mrr',0)); margin=float(account.get('gross_margin',0.8)); churn=max(0.01,float(account.get('monthly_churn',0.03)))
    ltv=(mrr*margin)/churn
    return {"ltv":round(ltv,2),"assumptions":{"margin":margin,"churn":churn}}


async def detect_contract_renewal_risks(contract: dict, usage_signals: dict) -> dict:
    risks=[]
    if int(contract.get('days_to_renewal',999))<75 and not usage_signals.get('exec_alignment'): risks.append('no_exec_alignment')
    if usage_signals.get('adoption_drop_pct',0)>18: risks.append('adoption_drop')
    if usage_signals.get('open_critical_ticket'): risks.append('critical_support_issue')
    return {"risks":risks,"risk_level":"high" if len(risks)>=3 else "medium" if risks else "low","recommended_play":"renewal_save" if risks else "standard_renewal"}
