from typing import Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from agents.shared.base_agent import BaseAgent, BaseAgentState
from agents.copywriter.prompts import COPYWRITER_AGENT_SYSTEM
from agents.copywriter.tools import generate_sales_script, rewrite_email, create_linkedin_post

class CopywriterAgentState(BaseAgentState):
    generated_content: Optional[Dict[str, Any]]

class CopywriterAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="copywriter", gemini_model="gemini-1.5-pro")

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(CopywriterAgentState)

        workflow.add_node("generate_copy", self._generate_copy)
        workflow.set_entry_point("generate_copy")
        workflow.add_edge("generate_copy", END)

        return workflow.compile()

    async def _generate_copy(self, state: CopywriterAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        action = context.get("action")

        content = {}

        if action == "script":
            persona = context.get("persona", "Decision Maker")
            pains = context.get("pain_points", [])
            res = await generate_sales_script(persona, pains)
            content = res.get("data")

        elif action == "rewrite":
            text = context.get("text")
            tone = context.get("tone", "professional")
            if text:
                res = await rewrite_email(text, tone)
                content = res.get("data")

        elif action == "linkedin_post":
            topic = context.get("topic")
            style = context.get("style", "thought_leadership")
            if topic:
                res = await create_linkedin_post(topic, style)
                content = res.get("data")

        return {
            "generated_content": content,
            "actions_taken": [{"action": action, "status": "completed"}]
        }
