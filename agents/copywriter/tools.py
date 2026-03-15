from typing import Dict, Any, List
from agents.shared.tool_runtime import run_tool

async def _generate_sales_script(persona: str, pain_points: List[str]) -> Dict[str, Any]:
    # Mock script
    return {
        "persona": persona,
        "opening": "Hi, I noticed...",
        "value_prop": f"We solve {pain_points[0]} by...",
        "closing": "Are you open to learning more?"
    }

async def generate_sales_script(persona: str, pain_points: List[str]) -> Dict[str, Any]:
    return await run_tool(
        tool_name="copywriter.generate_sales_script",
        handler=_generate_sales_script,
        payload={"persona": persona, "pain_points": pain_points},
        idempotent=True,
    )

async def _rewrite_email(original_text: str, tone: str) -> Dict[str, Any]:
    # Mock rewrite
    return {
        "original": original_text,
        "tone": tone,
        "rewritten": f"[Rewritten in {tone} tone]: {original_text[:20]}... (improved)"
    }

async def rewrite_email(original_text: str, tone: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="copywriter.rewrite_email",
        handler=_rewrite_email,
        payload={"original_text": original_text, "tone": tone},
        idempotent=True,
    )

async def _create_linkedin_post(topic: str, style: str) -> Dict[str, Any]:
    # Mock post
    return {
        "topic": topic,
        "post_content": f"Here's why {topic} matters...\n\n#Growth",
        "hashtags": ["#Sales", "#Tech"]
    }

async def create_linkedin_post(topic: str, style: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="copywriter.create_linkedin_post",
        handler=_create_linkedin_post,
        payload={"topic": topic, "style": style},
        idempotent=True,
    )


async def generate_subject_line(topic: str) -> Dict[str, Any]:
    return {"subject": f"{topic}: insight rápido"}


async def adapt_copy_for_persona(copy: str, persona: str) -> Dict[str, Any]:
    return {"persona": persona, "adapted_copy": f"{persona}: {copy}"}


async def draft_cta_variants(goal: str) -> Dict[str, Any]:
    return {"variants": [f"Agendar {goal}", f"Ver como {goal}", f"Explorar {goal}"]}


async def summarize_message_framework(points: List[str]) -> Dict[str, Any]:
    return {"summary": " | ".join(points[:3]), "count": len(points)}
