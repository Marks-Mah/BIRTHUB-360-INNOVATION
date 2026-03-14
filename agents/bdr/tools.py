from typing import Dict, Any, List
import random
from agents.shared.tool_runtime import run_tool

async def _find_leads(criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
    # Mock implementation of lead scraping/finding
    industry = criteria.get("industry", "Technology")
    role = criteria.get("role", "CTO")

    # In a real scenario, this would call Apollo, ZoomInfo, or a scraper.
    return [
        {
            "name": "John Doe",
            "company": f"Tech {i}",
            "role": role,
            "industry": industry,
            "email": f"john.doe{i}@tech{i}.com",
            "linkedin": f"linkedin.com/in/johndoe{i}"
        }
        for i in range(1, 4)
    ]

async def find_leads(criteria: Dict[str, Any]) -> Dict[str, Any]:
    return await run_tool(
        tool_name="bdr.find_leads",
        handler=_find_leads,
        payload={"criteria": criteria},
        idempotent=True,
    )

async def _verify_email(email: str) -> Dict[str, Any]:
    # Mock email verification
    is_valid = random.random() > 0.1 # 90% valid
    return {
        "email": email,
        "valid": is_valid,
        "score": 0.95 if is_valid else 0.1,
        "reason": "smtp_check" if is_valid else "bounce"
    }

async def verify_email(email: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="bdr.verify_email",
        handler=_verify_email,
        payload={"email": email},
        idempotent=True,
    )

async def _generate_outreach_sequence(lead: Dict[str, Any]) -> List[Dict[str, Any]]:
    # Simple cadence generation
    return [
        {"step": 1, "day": 1, "channel": "email", "subject": "Quick question"},
        {"step": 2, "day": 3, "channel": "linkedin", "message": "Connected?"},
        {"step": 3, "day": 6, "channel": "email", "subject": "Following up"}
    ]

async def generate_outreach_sequence(lead: Dict[str, Any]) -> Dict[str, Any]:
    return await run_tool(
        tool_name="bdr.generate_outreach_sequence",
        handler=_generate_outreach_sequence,
        payload={"lead": lead},
        idempotent=True,
    )
