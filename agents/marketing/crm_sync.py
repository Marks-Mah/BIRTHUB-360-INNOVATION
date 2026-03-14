from __future__ import annotations


def build_attribution_payload(tenant_id: str, channels: list[str], scored_leads: list[dict]) -> dict:
    return {
        "tenantId": tenant_id,
        "channels": channels,
        "touchpoints": len(channels),
        "qualified_leads": len([l for l in scored_leads if l.get("score", 0) >= 70]),
    }
