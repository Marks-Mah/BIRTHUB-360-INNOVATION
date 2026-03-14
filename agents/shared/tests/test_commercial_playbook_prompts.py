from agents.bdr.prompts import BDR_AGENT_SYSTEM
from agents.closer.prompts import CLOSER_AGENT_SYSTEM
from agents.sales_ops.prompts import SALES_OPS_AGENT_SYSTEM
from agents.enablement.prompts import ENABLEMENT_AGENT_SYSTEM
from agents.kam.prompts import KAM_AGENT_SYSTEM
from agents.partners.prompts import PARTNERS_AGENT_SYSTEM
from agents.field.prompts import FIELD_AGENT_SYSTEM
from agents.pre_sales.prompts import PRE_SALES_AGENT_SYSTEM
from agents.copywriter.prompts import COPYWRITER_AGENT_SYSTEM
from agents.social.prompts import SOCIAL_AGENT_SYSTEM


PROMPTS = {
    "bdr": BDR_AGENT_SYSTEM,
    "closer": CLOSER_AGENT_SYSTEM,
    "sales_ops": SALES_OPS_AGENT_SYSTEM,
    "enablement": ENABLEMENT_AGENT_SYSTEM,
    "kam": KAM_AGENT_SYSTEM,
    "partners": PARTNERS_AGENT_SYSTEM,
    "field": FIELD_AGENT_SYSTEM,
    "pre_sales": PRE_SALES_AGENT_SYSTEM,
    "copywriter": COPYWRITER_AGENT_SYSTEM,
    "social": SOCIAL_AGENT_SYSTEM,
}


REQUIRED_SNIPPETS = [
    "Operational Contract",
    "tenant_id",
    "request_id",
    "Fallback Behavior",
    "Backlog Alignment",
]


def test_commercial_prompts_include_operational_contract() -> None:
    for agent_key, prompt in PROMPTS.items():
        for snippet in REQUIRED_SNIPPETS:
            assert snippet in prompt, f"{agent_key} missing snippet: {snippet}"
