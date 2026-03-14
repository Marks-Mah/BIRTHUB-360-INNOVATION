from __future__ import annotations


def build_campaign_cadence(campaign_name: str, channels: list[str]) -> dict:
    steps = []
    for idx, channel in enumerate(channels, start=1):
        steps.append({"step": idx, "channel": channel, "objective": f"touchpoint_{idx}"})
    return {
        "campaign": campaign_name,
        "cadence": steps,
    }
