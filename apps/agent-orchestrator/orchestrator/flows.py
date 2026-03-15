from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated, List, Dict, Any, Literal
import operator
import os
from uuid import uuid4
import logging

from orchestrator.event_bus import AgentTaskEvent, EventBus

EVENT_BUS = EventBus(os.getenv("REDIS_URL", "redis://localhost:6379"))
logger = logging.getLogger("orchestrator.flows")


async def _post_with_retry(url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    logger.info("Dispatching orchestrator payload", extra={"url": url})
    return {"url": url, "payload": payload}


async def _trigger_agent_action(*, agent_type: str, task: str, payload: Dict[str, Any], action_name: str) -> Dict[str, Any]:
    event = AgentTaskEvent(event_id=str(uuid4()), tenant_id=str(payload.get("tenant_id", "unknown")), agent_type=agent_type, task=task, payload=payload, correlation_id=str(uuid4()))
    await EVENT_BUS.publish(event)
    return {"actions_taken": [action_name]}


# --- State Definitions ---

class OrchestratorState(TypedDict):
    lead_id: str
    context: Dict[str, Any]
    score: int
    tier: str
    actions_taken: Annotated[List[str], operator.add]
    error: str


# --- Nodes Implementation ---

async def ldr_enrich(state: OrchestratorState):
    logger.info("Executing LDR Enrichment", extra={"lead_id": state["lead_id"]})
    await _trigger_agent_action(agent_type="ldr", task="run", payload={"lead_id": state["lead_id"], "context": state["context"]}, action_name="ldr_enrich_completed")
    return {"actions_taken": ["ldr_enrich_completed"]}


async def ldr_score(state: OrchestratorState):
    logger.info("Executing LDR Scoring", extra={"lead_id": state["lead_id"]})
    await _trigger_agent_action(agent_type="ldr", task="score", payload={"lead_data": state["context"]}, action_name="ldr_score_requested")
    return {"score": int(state.get("context", {}).get("score", 0)), "tier": state.get("context", {}).get("tier", "T4"), "actions_taken": ["ldr_score_calculated"]}


def check_score_condition(state: OrchestratorState) -> Literal["high_priority", "medium_priority", "nurture", "disqualify"]:
    score = state.get("score", 0)
    logger.info("Checking lead score", extra={"score": score})
    if score >= 90:
        return "high_priority"
    if score >= 70:
        return "medium_priority"
    if score >= 50:
        return "nurture"
    return "disqualify"


async def alert_ae(state: OrchestratorState):
    logger.info("Alerting AE for high priority lead")
    return await _trigger_agent_action(
        agent_type="ae",
        task="run",
        payload={"lead_id": state["lead_id"], "context": state["context"]},
        action_name="alert_ae_sent",
    )


async def sdr_outreach_immediate(state: OrchestratorState):
    logger.info("Triggering Immediate SDR Outreach")
    return await _trigger_agent_action(
        agent_type="sdr",
        task="run",
        payload={"lead_id": state["lead_id"], "context": state["context"]},
        action_name="sdr_outreach_immediate_started",
    )


async def sdr_queue_priority(state: OrchestratorState):
    logger.info("Queueing for SDR Priority")
    return await _trigger_agent_action(
        agent_type="sdr",
        task="queue-priority",
        payload={"lead_id": state["lead_id"], "context": state["context"]},
        action_name="sdr_queue_priority_added",
    )


async def nurture_sequence(state: OrchestratorState):
    logger.info("Starting Nurture Sequence")
    return await _trigger_agent_action(
        agent_type="marketing",
        task="run",
        payload={"lead_id": state["lead_id"], "context": state["context"]},
        action_name="nurture_sequence_started",
    )


async def disqualify_lead(state: OrchestratorState):
    logger.info("Disqualifying Lead")
    return await _trigger_agent_action(
        agent_type="ldr",
        task="disqualify",
        payload={"lead_id": state["lead_id"], "context": state["context"]},
        action_name="lead_disqualified",
    )


class LifecycleEventState(TypedDict):
    entity_id: str
    context: Dict[str, Any]
    actions_taken: Annotated[List[str], operator.add]
    error: str


async def financeiro_emit_invoice(state: LifecycleEventState):
    return await _trigger_agent_action(
        agent_type="financeiro",
        task="run",
        payload={"event": "DEAL_CLOSED_WON", "entity_id": state["entity_id"], "context": state["context"]},
        action_name="financeiro_emit_invoice_requested",
    )


async def juridico_generate_contract(state: LifecycleEventState):
    return await _trigger_agent_action(
        agent_type="juridico",
        task="run",
        payload={"event": "DEAL_CLOSED_WON", "entity_id": state["entity_id"], "context": state["context"]},
        action_name="juridico_generate_contract_requested",
    )


async def pos_venda_start_onboarding(state: LifecycleEventState):
    return await _trigger_agent_action(
        agent_type="pos-venda",
        task="run",
        payload={"event": "DEAL_CLOSED_WON", "entity_id": state["entity_id"], "context": state["context"]},
        action_name="pos_venda_start_onboarding_requested",
    )


async def analista_log_anomaly(state: LifecycleEventState):
    return await _trigger_agent_action(
        agent_type="analista",
        task="run",
        payload={"event": "HEALTH_ALERT", "entity_id": state["entity_id"], "context": state["context"]},
        action_name="analista_log_anomaly_requested",
    )


async def pos_venda_trigger_playbook(state: LifecycleEventState):
    return await _trigger_agent_action(
        agent_type="pos-venda",
        task="run",
        payload={"event": "HEALTH_ALERT", "entity_id": state["entity_id"], "context": state["context"]},
        action_name="pos_venda_trigger_playbook_requested",
    )


async def pos_venda_trigger_churn_playbook(state: LifecycleEventState):
    payload = {"event": "CHURN_RISK_HIGH", "entity_id": state["entity_id"], "context": state["context"]}
    await _post_with_retry("/run/event", payload)
    return {"actions_taken": ["pos_venda_trigger_churn_playbook_requested"]}


async def analista_log_churn_risk(state: LifecycleEventState):
    return await _trigger_agent_action(
        agent_type="analista",
        task="run",
        payload={"event": "CHURN_RISK_HIGH", "entity_id": state["entity_id"], "context": state["context"]},
        action_name="analista_log_churn_risk_requested",
    )


async def financeiro_prepare_retention_offer(state: LifecycleEventState):
    return await _trigger_agent_action(
        agent_type="financeiro",
        task="run",
        payload={"event": "CHURN_RISK_HIGH", "entity_id": state["entity_id"], "context": state["context"]},
        action_name="financeiro_prepare_retention_offer_requested",
    )


async def analista_generate_board_report(state: LifecycleEventState):
    return await _trigger_agent_action(
        agent_type="analista",
        task="run",
        payload={"event": "BOARD_REPORT", "entity_id": state["entity_id"], "context": state["context"]},
        action_name="analista_generate_board_report_requested",
    )


def _build_linear_flow(*nodes: tuple[str, Any]):
    graph = StateGraph(LifecycleEventState)
    first_node_name = nodes[0][0]
    graph.set_entry_point(first_node_name)

    for node_name, node_handler in nodes:
        graph.add_node(node_name, node_handler)

    for index in range(len(nodes) - 1):
        graph.add_edge(nodes[index][0], nodes[index + 1][0])

    graph.add_edge(nodes[-1][0], END)
    return graph.compile()


# --- Graph Construction ---

workflow = StateGraph(OrchestratorState)

workflow.add_node("ldr_enrich", ldr_enrich)
workflow.add_node("ldr_score", ldr_score)
workflow.add_node("alert_ae", alert_ae)
workflow.add_node("sdr_outreach_immediate", sdr_outreach_immediate)
workflow.add_node("sdr_queue_priority", sdr_queue_priority)
workflow.add_node("nurture_sequence", nurture_sequence)
workflow.add_node("disqualify_lead", disqualify_lead)

workflow.set_entry_point("ldr_enrich")
workflow.add_edge("ldr_enrich", "ldr_score")

workflow.add_conditional_edges(
    "ldr_score",
    check_score_condition,
    {
        "high_priority": "alert_ae",
        "medium_priority": "sdr_queue_priority",
        "nurture": "nurture_sequence",
        "disqualify": "disqualify_lead"
    }
)

workflow.add_edge("alert_ae", "sdr_outreach_immediate")
workflow.add_edge("sdr_outreach_immediate", END)
workflow.add_edge("sdr_queue_priority", END)
workflow.add_edge("nurture_sequence", END)
workflow.add_edge("disqualify_lead", END)

FLOW_LEAD_LIFECYCLE_GRAPH = workflow.compile()

FLOW_DEAL_WON_GRAPH = _build_linear_flow(
    ("financeiro_emit_invoice", financeiro_emit_invoice),
    ("juridico_generate_contract", juridico_generate_contract),
    ("pos_venda_start_onboarding", pos_venda_start_onboarding),
)
FLOW_HEALTH_ALERT_GRAPH = _build_linear_flow(
    ("analista_log_anomaly", analista_log_anomaly),
    ("pos_venda_trigger_playbook", pos_venda_trigger_playbook),
)
FLOW_CHURN_RISK_HIGH_GRAPH = _build_linear_flow(
    ("analista_log_churn_risk", analista_log_churn_risk),
    ("financeiro_prepare_retention_offer", financeiro_prepare_retention_offer),
    ("pos_venda_trigger_churn_playbook", pos_venda_trigger_churn_playbook),
)
FLOW_BOARD_REPORT_GRAPH = _build_linear_flow(
    ("analista_generate_board_report", analista_generate_board_report),
)

FLOW_LEAD_LIFECYCLE = "Implemented as StateGraph (FLOW_LEAD_LIFECYCLE_GRAPH)"
FLOW_DEAL_WON = "Implemented as StateGraph (FLOW_DEAL_WON_GRAPH)"
FLOW_HEALTH_ALERT = "Implemented as StateGraph (FLOW_HEALTH_ALERT_GRAPH)"
FLOW_CHURN_RISK_HIGH = "Implemented as StateGraph (FLOW_CHURN_RISK_HIGH_GRAPH)"
FLOW_BOARD_REPORT = "Implemented as StateGraph (FLOW_BOARD_REPORT_GRAPH)"
