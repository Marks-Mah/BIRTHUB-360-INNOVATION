from typing import Dict, Any


def build_deal_followup(stage: str) -> Dict[str, Any]:
    mapping = {
        "prospecting": ["discovery_call", "pain_mapping"],
        "proposal": ["proposal_walkthrough", "roi_review"],
        "negotiation": ["legal_review", "pricing_alignment"],
    }
    return {"stage": stage, "steps": mapping.get(stage, ["manual_review"])}
