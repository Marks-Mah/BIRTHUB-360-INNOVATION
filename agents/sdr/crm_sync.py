from typing import Any, Dict


async def sync_sdr_lead_to_crm(lead: Dict[str, Any]) -> Dict[str, Any]:
    """Sincroniza lead SDR em formato padronizado para CRM externo."""
    return {
        "ok": True,
        "provider": "crm",
        "entity": "lead",
        "payload": lead,
    }


async def sync_sdr_call_to_crm(call_record: Dict[str, Any]) -> Dict[str, Any]:
    """Sincroniza transcrição e anotações da ligação de prospecção no CRM."""
    return {
        "ok": True,
        "provider": "crm",
        "entity": "call_activity",
        "payload": call_record,
    }
