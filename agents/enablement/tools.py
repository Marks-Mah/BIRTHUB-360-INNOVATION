from typing import Dict, Any, List
from agents.shared.tool_runtime import run_tool

async def _analyze_call_transcript(transcript: str, methodology: str = "SPIN") -> Dict[str, Any]:
    # Mock analysis
    return {
        "score": 85,
        "methodology": methodology,
        "key_moments": [
            {"time": "02:30", "label": "Great discovery question"},
            {"time": "15:00", "label": "Missed closing signal"}
        ],
        "sentiment": "Positive"
    }

async def analyze_call_transcript(transcript: str, methodology: str = "SPIN") -> Dict[str, Any]:
    return await run_tool(
        tool_name="enablement.analyze_call_transcript",
        handler=_analyze_call_transcript,
        payload={"transcript": transcript, "methodology": methodology},
        idempotent=True,
    )

async def _create_coaching_card(rep_id: str, analysis: Dict[str, Any]) -> Dict[str, Any]:
    # Mock coaching card
    return {
        "rep_id": rep_id,
        "focus_area": "Closing",
        "action_items": [
            "Review objection handling script",
            "Listen to call #123 from Top Performer"
        ],
        "encouragement": "Great job on building rapport!"
    }

async def create_coaching_card(rep_id: str, analysis: Dict[str, Any]) -> Dict[str, Any]:
    return await run_tool(
        tool_name="enablement.create_coaching_card",
        handler=_create_coaching_card,
        payload={"rep_id": rep_id, "analysis": analysis},
        idempotent=True,
    )

async def _generate_training_quiz(topic: str, difficulty: str) -> Dict[str, Any]:
    # Mock quiz
    return {
        "topic": topic,
        "questions": [
            {"q": "What is the 'P' in SPIN?", "a": ["Problem", "Price", "Product"], "correct": "Problem"}
        ]
    }

async def generate_training_quiz(topic: str, difficulty: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="enablement.generate_training_quiz",
        handler=_generate_training_quiz,
        payload={"topic": topic, "difficulty": difficulty},
        idempotent=True,
    )


async def score_rep_readiness(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"readiness": min(100, int(context.get("readiness", 78)))}


async def build_objection_drill(objections: List[str]) -> Dict[str, Any]:
    return {"drill": [{"objection": item, "response": "Explorar impacto e ROI"} for item in objections]}


async def recommend_training_path(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"path": ["discovery", "negociacao", "forecast"], "focus": context.get("focus", "closing")}


async def summarize_manager_notes(notes: List[str]) -> Dict[str, Any]:
    return {"summary": " ".join(notes[:2]), "note_count": len(notes)}
