from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import os
import random
from typing import Dict, Any, List

import httpx
from pydantic import BaseModel, Field

from agents.shared.tool_runtime import run_tool
from agents.shared.errors import AgentToolError
from .schemas import ScheduleMeetingInput


async def _generate_icebreaker(lead: Dict[str, Any], recent_news: str, linkedin_post: str) -> str:
    name = str(lead.get("name", "Prospect"))
    company = str(lead.get("company", "Company"))
    if recent_news:
        return f"Oi {name}, vi a notícia sobre {company}: {recent_news}."
    if linkedin_post:
        return f"Oi {name}, curti seu post sobre {linkedin_post[:30]}."
    return f"Oi {name}, notei que a {company} está acelerando crescimento."


async def generate_icebreaker(lead: Dict[str, Any], recent_news: str, linkedin_post: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="sdr.generate_icebreaker",
        handler=_generate_icebreaker,
        payload={"lead": lead, "recent_news": recent_news, "linkedin_post": linkedin_post},
        idempotent=True,
    )


async def _generate_email_sequence(lead: Dict[str, Any], cadence_config: Dict[str, Any]) -> List[Dict[str, Any]]:
    sequence = []
    tone = cadence_config.get("tone", "professional")

    for i in range(1, 4):
        sequence.append(
            {
                "step": i,
                "day": i * 2,
                "subject": f"Step {i} - {tone} outreach",
                "body": f"Email body for step {i} focused on {cadence_config.get('value_prop_focus', 'value')}",
                "channel": "email",
            }
        )
    return sequence


async def generate_email_sequence(lead: Dict[str, Any], cadence_config: Dict[str, Any]) -> Dict[str, Any]:
    return await run_tool(
        tool_name="sdr.generate_email_sequence",
        handler=_generate_email_sequence,
        payload={"lead": lead, "cadence_config": cadence_config},
        idempotent=True,
    )


async def _detect_optimal_send_time(lead: Dict[str, Any]) -> Dict[str, Any]:
    return {"best_day": "Tuesday", "best_hour": 10, "confidence": 0.85}


async def detect_optimal_send_time(lead: Dict[str, Any]) -> Dict[str, Any]:
    return await run_tool(
        tool_name="sdr.detect_optimal_send_time",
        handler=_detect_optimal_send_time,
        payload={"lead": lead},
        idempotent=True,
    )


async def _schedule_meeting(ae_calendar_id: str, lead_timezone: str, slots: int = 3) -> Dict[str, Any]:
    validated = ScheduleMeetingInput(
        ae_calendar_id=ae_calendar_id,
        lead_timezone=lead_timezone,
        slots=slots,
    )

    service_token = os.getenv("GOOGLE_CALENDAR_ACCESS_TOKEN")
    now_local = datetime.now(ZoneInfo(validated.lead_timezone))

    search_start = now_local.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    search_end = search_start + timedelta(days=7)

    if service_token:
        body = {
            "timeMin": search_start.astimezone(ZoneInfo("UTC")).isoformat(),
            "timeMax": search_end.astimezone(ZoneInfo("UTC")).isoformat(),
            "items": [{"id": validated.ae_calendar_id}],
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://www.googleapis.com/calendar/v3/freeBusy",
                json=body,
                headers={"Authorization": f"Bearer {service_token}"},
            )
            response.raise_for_status()
            busy_periods = response.json().get("calendars", {}).get(validated.ae_calendar_id, {}).get("busy", [])

        busy_starts = {
            datetime.fromisoformat(p["start"].replace("Z", "+00:00")).astimezone(ZoneInfo(validated.lead_timezone)).replace(
                minute=0, second=0, microsecond=0
            )
            for p in busy_periods
        }
    else:
        busy_starts = set()

    generated_slots: List[Dict[str, str]] = []
    cursor = search_start
    while len(generated_slots) < validated.slots and cursor < search_end:
        if cursor.weekday() < 5 and 9 <= cursor.hour <= 17 and cursor not in busy_starts:
            generated_slots.append(
                {
                    "datetime": cursor.astimezone(ZoneInfo("UTC")).isoformat().replace("+00:00", "Z"),
                    "calendar_link": f"https://calendar.google.com/calendar/u/0/r/eventedit?text=Discovery+Call&dates={cursor.astimezone(ZoneInfo('UTC')).strftime('%Y%m%dT%H%M%SZ')}/{(cursor + timedelta(minutes=30)).astimezone(ZoneInfo('UTC')).strftime('%Y%m%dT%H%M%SZ')}",
                }
            )
        cursor += timedelta(hours=1)

    return {"slots": generated_slots, "reminder_flow": {"email": True, "sms": False}}


async def schedule_meeting(ae_calendar_id: str, lead_timezone: str, slots: int = 3) -> Dict[str, Any]:
    return await run_tool(
        tool_name="sdr.schedule_meeting",
        handler=_schedule_meeting,
        payload={"ae_calendar_id": ae_calendar_id, "lead_timezone": lead_timezone, "slots": slots},
        validation_model=ScheduleMeetingInput,
        timeout_s=12.0,
        idempotent=True,
    )


async def _classify_objection(email_reply: str) -> Dict[str, Any]:
    email_lower = email_reply.lower()

    if "not interested" in email_lower:
        return {
            "category": "real_rejection",
            "confidence": 0.9,
            "suggested_response": "Understood, thank you for letting me know.",
            "next_action": "close_lead",
        }
    if any(kw in email_lower for kw in ["price", "budget", "expensive", "cost"]):
        return {
            "category": "budget_concern",
            "confidence": 0.8,
            "suggested_response": "We have flexible plans...",
            "next_action": "handle_objection",
        }
    if any(kw in email_lower for kw in ["talk", "meet", "call", "schedule"]):
        return {
            "category": "ready_to_meet",
            "confidence": 0.95,
            "suggested_response": "Great, here is my calendar...",
            "next_action": "schedule_meeting",
        }

    return {
        "category": "needs_more_info",
        "confidence": 0.5,
        "suggested_response": "Could you clarify?",
        "next_action": "reply_email",
    }


async def classify_objection(email_reply: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="sdr.classify_objection",
        handler=_classify_objection,
        payload={"email_reply": email_reply},
        idempotent=True,
    )


async def manage_domain_warmup(domains: List[str], daily_limit: int) -> Dict[str, Any]:
    """Estimate sending-health per domain and safe recommended volume."""
    if daily_limit < 1:
        raise AgentToolError(code="INVALID_DAILY_LIMIT", message="daily_limit deve ser >= 1")
    health = {}
    for d in domains:
        health[d] = "healthy" if random.random() > 0.1 else "at_risk"

    return {"domain_health": health, "recommended_volume": {d: daily_limit for d in domains}, "warnings": []}


async def qualify_inbound_lead(chat_session: Dict[str, Any]) -> Dict[str, Any]:
    """Apply lightweight BANT-style qualification from inbound chat answers."""
    score = 0
    answers = chat_session.get("answers", {})
    if answers.get("budget", False):
        score += 30
    if answers.get("authority", False):
        score += 30

    return {"qualified": score >= 50, "score": score, "answers": answers}


async def build_call_script(lead: Dict[str, Any], pain_points: List[str]) -> Dict[str, Any]:
    script = {
        "opening": f"{lead.get('name', 'Prospect')}, notei que {lead.get('company', 'sua empresa')} está crescendo.",
        "discovery_questions": [f"Como vocês tratam {p}?" for p in pain_points[:5]],
        "cta": "Faz sentido agendarmos 20 minutos para aprofundar?",
    }
    return script


async def enrich_prospect_context(lead: Dict[str, Any], signals: Dict[str, Any]) -> Dict[str, Any]:
    return {"lead": lead, "context": {"hiring": signals.get("hiring", False), "funding": signals.get("funding", False), "intent_score": signals.get("intent_score", 0)}}


async def prioritize_daily_tasks(tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
    ordered = sorted(tasks, key=lambda t: (t.get("priority", 0), -t.get("age_days", 0)), reverse=True)
    return {"tasks": ordered, "top_5": ordered[:5]}


async def generate_multichannel_cadence(lead: Dict[str, Any], steps: int = 7) -> Dict[str, Any]:
    channels = ["email", "linkedin", "phone", "whatsapp"]
    cadence = [{"step": i + 1, "day": i + 1, "channel": channels[i % len(channels)], "goal": "advance_conversation"} for i in range(steps)]
    return {"lead_id": lead.get("id"), "cadence": cadence}


async def assess_deliverability_risk(campaign_stats: Dict[str, Any]) -> Dict[str, Any]:
    bounce = float(campaign_stats.get("bounce_rate", 0))
    spam = float(campaign_stats.get("spam_rate", 0))
    risk = "high" if bounce > 0.05 or spam > 0.01 else "medium" if bounce > 0.03 else "low"
    return {"risk": risk, "recommendations": ["reduzir volume" if risk != "low" else "manter ritmo"]}


async def propose_follow_up_message(previous_reply: str, lead: Dict[str, Any]) -> Dict[str, Any]:
    tone = "consultivo" if "preço" in previous_reply.lower() else "objetivo"
    message = f"Oi {lead.get('name', '')}, obrigado pela resposta. Posso compartilhar um caso rápido de resultado em 30 dias?"
    return {"tone": tone, "message": message}


async def score_lead_temperature(lead_signals: Dict[str, Any]) -> Dict[str, Any]:
    score = int(lead_signals.get("opens", 0)) * 2 + int(lead_signals.get("clicks", 0)) * 5 + int(lead_signals.get("replies", 0)) * 15
    category = "hot" if score >= 60 else "warm" if score >= 25 else "cold"
    return {"score": score, "category": category}


async def generate_linkedin_sequence(lead: Dict[str, Any], days: int = 10) -> Dict[str, Any]:
    sequence = [
        {"day": 1, "type": "connection_request", "text": f"{lead.get('name', '')}, posso te adicionar para trocar ideias de RevOps?"},
        {"day": min(days, 4), "type": "value_message", "text": "Compartilho benchmark de conversão B2B se fizer sentido."},
        {"day": min(days, 8), "type": "cta", "text": "Topa uma conversa de 15 minutos esta semana?"},
    ]
    return {"sequence": sequence}


async def qualify_lead_with_bant(answers: Dict[str, Any]) -> Dict[str, Any]:
    score = sum(25 for k in ["budget", "authority", "need", "timeline"] if answers.get(k))
    return {"score": score, "qualified": score >= 75, "missing": [k for k in ["budget", "authority", "need", "timeline"] if not answers.get(k)]}


async def detect_persona_fit(lead: Dict[str, Any], target_personas: List[str]) -> Dict[str, Any]:
    title = lead.get("title", "").lower()
    fit = any(p.lower() in title for p in target_personas)
    return {"fit": fit, "title": lead.get("title"), "recommended_track": "primary" if fit else "secondary"}


async def estimate_reply_probability(lead: Dict[str, Any], touch_count: int) -> Dict[str, Any]:
    base = 0.25 if lead.get("source") == "inbound" else 0.12
    probability = max(0.02, min(0.75, base - (touch_count * 0.01) + (0.08 if lead.get("engaged") else 0)))
    return {"reply_probability": round(probability, 2)}


async def generate_objection_playbook() -> Dict[str, Any]:
    return {
        "budget": ["explorar custo de inação", "oferecer rollout faseado"],
        "timing": ["agendar checkpoint", "compartilhar quick wins"],
        "authority": ["pedir inclusão do decisor", "enviar resumo executivo"],
    }


async def orchestrate_handoff_to_ae(lead: Dict[str, Any], discovery_notes: Dict[str, Any]) -> Dict[str, Any]:
    return {"lead_id": lead.get("id"), "summary": discovery_notes, "required_fields": ["use_case", "timeline", "stakeholders"], "handoff_ready": all(discovery_notes.get(k) for k in ["use_case", "timeline"])}


async def schedule_follow_up_tasks(meeting_date_iso: str, owner: str) -> Dict[str, Any]:
    return {"owner": owner, "tasks": [{"task": "send_recap", "due": meeting_date_iso}, {"task": "confirm_next_steps", "due": meeting_date_iso}]}


async def audit_outreach_quality(messages: List[str]) -> Dict[str, Any]:
    overly_generic = [m for m in messages if len(m) < 80]
    return {"message_count": len(messages), "quality_score": max(0, 100 - len(overly_generic) * 10), "needs_revision": overly_generic}




async def run_prospecting_call(lead: Dict[str, Any], script: Dict[str, Any], qualification_goals: List[str]) -> Dict[str, Any]:
    """Simula ligação de prospecção em tom humano e coleta respostas para qualificação."""
    name = lead.get("name", "Prospect")
    company = lead.get("company", "Empresa")
    opener = script.get("opening") or f"Olá {name}, tudo bem? Aqui é do time comercial da BirtHub."

    answers = {
        "budget": bool(lead.get("has_budget", True)),
        "authority": bool(lead.get("is_decision_maker", False)),
        "need": bool(lead.get("has_pain", True)),
        "timeline": lead.get("timeline", "30-60 dias"),
    }

    transcript_lines = [
        f"SDR: {opener}",
        f"Lead: Oi, pode falar.",
        f"SDR: Vi que a {company} está avaliando eficiência comercial. Faz sentido?",
        f"Lead: Sim, estamos buscando melhorar conversão e previsibilidade.",
        f"SDR: Sobre janela de decisão, vocês pensam em {answers['timeline']}?",
        f"Lead: Sim, nessa faixa.",
    ]

    rapport = {
        "tone": "consultivo_humano",
        "empathy_markers": ["escuta_ativa", "contextualizacao_do_negocio"],
        "conversation_quality": 0.89,
    }

    return {
        "call_outcome": "engaged",
        "qualification_goals": qualification_goals,
        "answers": answers,
        "rapport": rapport,
        "transcript": "\n".join(transcript_lines),
    }


async def auto_qualify_from_call(call_data: Dict[str, Any]) -> Dict[str, Any]:
    """Qualifica autonomamente lead a partir do conteúdo da ligação."""
    answers = call_data.get("answers", {})
    score = 0
    score += 25 if answers.get("budget") else 0
    score += 25 if answers.get("authority") else 0
    score += 25 if answers.get("need") else 0
    score += 25 if bool(answers.get("timeline")) else 0
    return {
        "score": score,
        "qualified": score >= 75,
        "stage": "sql" if score >= 75 else "nurture",
        "missing": [k for k in ["budget", "authority", "need", "timeline"] if not answers.get(k)],
    }


async def generate_call_record(call_data: Dict[str, Any], qualification: Dict[str, Any], lead: Dict[str, Any]) -> Dict[str, Any]:
    """Gera registro de ligação com notas estruturadas + transcrição para CRM."""
    return {
        "lead": {
            "id": lead.get("id") or lead.get("lead_id"),
            "name": lead.get("name", "Prospect"),
            "company": lead.get("company", "Empresa"),
            "phone": lead.get("phone", ""),
        },
        "call_summary": {
            "outcome": call_data.get("call_outcome", "unknown"),
            "qualification_score": qualification.get("score", 0),
            "qualified": qualification.get("qualified", False),
            "next_stage": qualification.get("stage", "nurture"),
        },
        "notes": {
            "rapport": call_data.get("rapport", {}),
            "missing_fields": qualification.get("missing", []),
        },
        "transcript": call_data.get("transcript", ""),
    }
