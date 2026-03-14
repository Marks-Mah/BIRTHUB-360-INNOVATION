from typing import Dict, Any


async def sync_deal_to_crm(deal: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "ok": True,
        "provider": "crm",
        "entity": "deal",
        "payload": deal,
    }
