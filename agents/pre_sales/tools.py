from typing import Dict, Any, List
from agents.shared.tool_runtime import run_tool

async def _generate_demo_credentials(company: str, duration_days: int) -> Dict[str, Any]:
    # Mock creds
    return {
        "url": f"https://{company.lower().replace(' ', '')}.demo.birthub.com",
        "username": "admin",
        "password": "temporary_password_123",
        "expires_in_days": duration_days
    }

async def generate_demo_credentials(company: str, duration_days: int) -> Dict[str, Any]:
    return await run_tool(
        tool_name="pre_sales.generate_demo_credentials",
        handler=_generate_demo_credentials,
        payload={"company": company, "duration_days": duration_days},
        idempotent=True,
    )

async def _answer_rfp_question(question: str) -> Dict[str, Any]:
    # Mock RFP
    return {
        "question": question,
        "answer": "Yes, our platform supports SOC2 Type II compliance and SSO integration.",
        "confidence": 0.98,
        "source": "Security_Whitepaper_v2.pdf"
    }

async def answer_rfp_question(question: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="pre_sales.answer_rfp_question",
        handler=_answer_rfp_question,
        payload={"question": question},
        idempotent=True,
    )

async def _check_technical_feasibility(requirement: str) -> Dict[str, Any]:
    # Mock feasibility
    feasible = "blockchain" not in requirement.lower()
    return {
        "requirement": requirement,
        "feasible": feasible,
        "notes": "Standard integration" if feasible else "Requires custom development",
        "effort_estimate": "2 days" if feasible else "4 weeks"
    }

async def check_technical_feasibility(requirement: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="pre_sales.check_technical_feasibility",
        handler=_check_technical_feasibility,
        payload={"requirement": requirement},
        idempotent=True,
    )
