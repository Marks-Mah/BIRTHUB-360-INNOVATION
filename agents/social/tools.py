from typing import Dict, Any, List
from agents.shared.tool_runtime import run_tool

async def _find_prospect_linkedin(name: str, company: str) -> Dict[str, Any]:
    # Mock lookup
    slug = f"{name.lower().replace(' ', '-')}-{company.lower().replace(' ', '-')}"
    return {
        "name": name,
        "company": company,
        "profile_url": f"https://linkedin.com/in/{slug}",
        "recent_post": "I'm excited to announce our Series B funding!",
        "post_id": "urn:li:share:12345"
    }

async def find_prospect_linkedin(name: str, company: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="social.find_prospect_linkedin",
        handler=_find_prospect_linkedin,
        payload={"name": name, "company": company},
        idempotent=True,
    )

async def _comment_on_post(post_content: str, stance: str) -> Dict[str, Any]:
    # Mock comment generation
    return {
        "post_content": post_content[:30] + "...",
        "generated_comment": f"Huge congratulations on the milestone! {stance} move for the industry.",
        "length": 65
    }

async def comment_on_post(post_content: str, stance: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="social.comment_on_post",
        handler=_comment_on_post,
        payload={"post_content": post_content, "stance": stance},
        idempotent=True,
    )

async def _send_connection_request(profile_url: str, message: str) -> Dict[str, Any]:
    # Mock connect
    return {
        "profile": profile_url,
        "message": message,
        "status": "sent",
        "timestamp": "2023-10-27T10:00:00Z"
    }

async def send_connection_request(profile_url: str, message: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="social.send_connection_request",
        handler=_send_connection_request,
        payload={"profile_url": profile_url, "message": message},
        idempotent=True,
    )


async def score_social_warmth(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"warmth_score": min(100, int(context.get("warmth_score", 68)))}


async def draft_follow_up_comment(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"comment": context.get("comment", "Ótimo ponto. Vale aprofundar esse movimento.")}


async def summarize_social_touchpoints(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {"touchpoints": len(items), "channels": sorted({item.get("channel", "linkedin") for item in items})}


async def recommend_social_sequence(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"sequence": ["view_profile", "like_post", "comment", "connect"], "owner": context.get("owner", "social_selling")}
