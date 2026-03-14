from typing import Any, Dict, List


def build_cadence_steps(role: str, channels: List[str] | None = None) -> Dict[str, Any]:
    channels = channels or ["email", "linkedin", "phone"]
    return {
        "role": role,
        "channels": channels,
        "steps": [
            {"day": 0, "channel": channels[0], "action": "intro"},
            {"day": 2, "channel": channels[0], "action": "value_follow_up"},
            {"day": 5, "channel": channels[-1], "action": "call_attempt"},
        ],
    }
