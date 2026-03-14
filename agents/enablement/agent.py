from typing import Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from agents.shared.base_agent import BaseAgent, BaseAgentState
from agents.enablement.prompts import ENABLEMENT_AGENT_SYSTEM
from agents.enablement.tools import analyze_call_transcript, create_coaching_card, generate_training_quiz

class EnablementAgentState(BaseAgentState):
    transcript_analysis: Optional[Dict[str, Any]]
    coaching_card: Optional[Dict[str, Any]]
    training_material: Optional[Dict[str, Any]]

class EnablementAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="enablement", gemini_model="gemini-1.5-pro")

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(EnablementAgentState)

        workflow.add_node("analyze_call", self._analyze_call)
        workflow.add_node("generate_coaching", self._generate_coaching)

        workflow.set_entry_point("analyze_call")

        workflow.add_edge("analyze_call", "generate_coaching")
        workflow.add_edge("generate_coaching", END)

        return workflow.compile()

    async def _analyze_call(self, state: EnablementAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        transcript = context.get("transcript")

        if transcript:
            res = await analyze_call_transcript(transcript)
            data = res.get("data", {})
            return {
                "transcript_analysis": data,
                "actions_taken": [{"action": "analyze_call", "score": data.get("score")}]
            }
        return {}

    async def _generate_coaching(self, state: EnablementAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        rep_id = context.get("rep_id", "unknown")
        analysis = state.get("transcript_analysis")

        if analysis:
            res = await create_coaching_card(rep_id, analysis)
            data = res.get("data", {})
            return {
                "coaching_card": data,
                "actions_taken": [{"action": "create_coaching_card"}]
            }
        return {}
