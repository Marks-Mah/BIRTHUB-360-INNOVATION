from typing import Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from agents.shared.base_agent import BaseAgent, BaseAgentState
from agents.social.prompts import SOCIAL_AGENT_SYSTEM
from agents.social.tools import find_prospect_linkedin, comment_on_post, send_connection_request

class SocialAgentState(BaseAgentState):
    social_profile: Optional[Dict[str, Any]]
    engagement_plan: Optional[Dict[str, Any]]

class SocialAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="social", gemini_model="gemini-1.5-flash") # Interactive

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(SocialAgentState)

        workflow.add_node("find_profile", self._find_profile)
        workflow.add_node("engage_content", self._engage_content)
        workflow.add_node("connect", self._connect)

        workflow.set_entry_point("find_profile")

        workflow.add_edge("find_profile", "engage_content")
        workflow.add_edge("engage_content", "connect")
        workflow.add_edge("connect", END)

        return workflow.compile()

    async def _find_profile(self, state: SocialAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        name = context.get("name")
        company = context.get("company")

        if name and company:
            res = await find_prospect_linkedin(name, company)
            return {
                "social_profile": res.get("data"),
                "actions_taken": [{"action": "find_profile", "url": res.get("data", {}).get("profile_url")}]
            }
        return {}

    async def _engage_content(self, state: SocialAgentState) -> Dict[str, Any]:
        profile = state.get("social_profile", {})
        post = profile.get("recent_post")

        if post:
            res = await comment_on_post(post, "supportive")
            return {
                "engagement_plan": {"comment": res.get("data")},
                "actions_taken": [{"action": "generate_comment"}]
            }
        return {}

    async def _connect(self, state: SocialAgentState) -> Dict[str, Any]:
        profile = state.get("social_profile", {})
        url = profile.get("profile_url")

        if url:
            msg = f"Hi {profile.get('name')}, loved your recent post. Let's connect!"
            res = await send_connection_request(url, msg)

            # Update engagement plan with connection status
            plan = state.get("engagement_plan", {})
            plan["connection"] = res.get("data")

            return {
                "engagement_plan": plan,
                "actions_taken": [{"action": "send_connection"}]
            }
        return {}
