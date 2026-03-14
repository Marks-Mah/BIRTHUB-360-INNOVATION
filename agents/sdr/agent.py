from typing import Dict, Any, List, Optional

from langgraph.graph import StateGraph, END

from agents.shared.base_agent import BaseAgent, BaseAgentState
from agents.sdr.prompts import CADENCE_RULES
from agents.sdr.cadence_engine import build_cadence_steps
from agents.sdr.crm_sync import sync_sdr_call_to_crm, sync_sdr_lead_to_crm
from agents.sdr.tools import (
    auto_qualify_from_call,
    build_call_script,
    classify_objection,
    detect_optimal_send_time,
    generate_call_record,
    generate_email_sequence,
    generate_icebreaker,
    run_prospecting_call,
    schedule_meeting,
)


class SDRAgentState(BaseAgentState):
    cadence_plan: Optional[Dict[str, Any]]
    email_sequence: Optional[List[Dict[str, Any]]]
    meeting_slots: Optional[List[Dict[str, Any]]]
    objection_analysis: Optional[Dict[str, Any]]
    call_result: Optional[Dict[str, Any]]
    qualification_result: Optional[Dict[str, Any]]
    call_record: Optional[Dict[str, Any]]


class SDRAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="sdr", gemini_model="gemini-1.5-pro")

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(SDRAgentState)
        workflow.add_node("determine_cadence", self._determine_cadence)
        workflow.add_node("run_prospecting_call", self._run_prospecting_call)
        workflow.add_node("generate_content", self._generate_content)
        workflow.add_node("handle_response", self._handle_response)
        workflow.add_node("schedule_meeting", self._schedule_meeting)

        workflow.set_entry_point("determine_cadence")
        workflow.add_conditional_edges(
            "determine_cadence",
            self._check_entry_type,
            {
                "new_lead": "run_prospecting_call",
                "response": "handle_response",
            },
        )
        workflow.add_edge("run_prospecting_call", "generate_content")
        workflow.add_edge("generate_content", END)

        workflow.add_conditional_edges(
            "handle_response",
            self._check_response_action,
            {
                "schedule": "schedule_meeting",
                "reply": END,
                "close": END,
            },
        )
        workflow.add_edge("schedule_meeting", END)
        return workflow.compile()

    def _check_entry_type(self, state: SDRAgentState) -> str:
        context = state.get("context", {})
        if context.get("type") == "inbound_response":
            return "response"
        return "new_lead"

    def _check_response_action(self, state: SDRAgentState) -> str:
        analysis = state.get("objection_analysis", {})
        action = analysis.get("next_action")
        if action == "schedule_meeting":
            return "schedule"
        if action == "close_lead":
            return "close"
        return "reply"

    async def _determine_cadence(self, state: SDRAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        role = context.get("role", "MANAGER").upper()
        if role not in CADENCE_RULES:
            role = "MANAGER"

        cadence_config = CADENCE_RULES[role]
        cadence_plan = {**cadence_config, **build_cadence_steps(role, cadence_config.get("channels", ["email"]))}
        return {"cadence_plan": cadence_plan, "actions_taken": [{"action": "determine_cadence", "result": role}]}

    async def _run_prospecting_call(self, state: SDRAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        lead = {
            "id": state.get("lead_id") or context.get("lead_id"),
            "name": context.get("name", "Prospect"),
            "company": context.get("company", "Company"),
            "phone": context.get("phone", ""),
            "has_budget": context.get("has_budget", True),
            "is_decision_maker": context.get("is_decision_maker", False),
            "has_pain": context.get("has_pain", True),
            "timeline": context.get("timeline", "30-60 dias"),
        }

        script = await build_call_script(lead, context.get("pain_points", ["baixa conversão", "pipeline imprevisível"]))
        call_result = await run_prospecting_call(lead, script, ["budget", "authority", "need", "timeline"])
        qualification = await auto_qualify_from_call(call_result)
        call_record = await generate_call_record(call_result, qualification, lead)
        crm_sync = await sync_sdr_call_to_crm(call_record)

        output = state.get("output", {}) or {}
        output["call"] = {
            "script": script,
            "result": call_result,
            "qualification": qualification,
            "record": call_record,
            "crm_sync": crm_sync,
        }
        return {
            "call_result": call_result,
            "qualification_result": qualification,
            "call_record": call_record,
            "output": output,
            "actions_taken": [{"action": "run_prospecting_call", "qualified": qualification.get("qualified", False)}],
        }

    async def _generate_content(self, state: SDRAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        lead_data = {"name": context.get("name", "Prospect"), "company": context.get("company", "Company")}
        cadence_config = state.get("cadence_plan", {})

        icebreaker = await generate_icebreaker(lead_data, "", "")
        sequence = await generate_email_sequence(lead_data, cadence_config)
        send_time = await detect_optimal_send_time(lead_data)

        icebreaker_data = icebreaker.get("data") if icebreaker.get("ok") else "Fallback intro"
        sequence_data = sequence.get("data") if sequence.get("ok") else []
        send_time_data = send_time.get("data") if send_time.get("ok") else {"best_day": "Tuesday", "best_hour": 10}

        output = state.get("output", {}) or {}
        output["outreach_plan"] = {
            "icebreaker": icebreaker_data,
            "sequence": sequence_data,
            "send_time": send_time_data,
        }
        return {"output": output, "email_sequence": sequence_data, "actions_taken": [{"action": "generate_content"}]}

    async def _handle_response(self, state: SDRAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        email_body = context.get("email_body", "")

        classification_result = await classify_objection(email_body)
        classification = (
            classification_result.get("data")
            if classification_result.get("ok")
            else {"category": "needs_more_info", "next_action": "reply_email"}
        )

        output = state.get("output", {}) or {}
        output["classification"] = classification
        return {
            "objection_analysis": classification,
            "output": output,
            "actions_taken": [{"action": "handle_response", "result": classification.get("category")}],
        }

    async def _schedule_meeting(self, state: SDRAgentState) -> Dict[str, Any]:
        result = await schedule_meeting("ae-cal-id", "UTC")
        meeting_payload = result.get("data") if result.get("ok") else {"slots": []}

        output = state.get("output", {}) or {}
        output["meeting_slots"] = meeting_payload
        output["crm_sync"] = await sync_sdr_lead_to_crm({"leadId": state.get("lead_id"), "tenantId": state.get("tenant_id")})
        return {
            "meeting_slots": meeting_payload.get("slots", []),
            "output": output,
            "actions_taken": [{"action": "schedule_meeting", "result": "Slots generated"}],
        }
