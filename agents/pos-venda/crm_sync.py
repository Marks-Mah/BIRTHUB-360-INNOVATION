from __future__ import annotations


def build_renewal_actions(renewals: list[dict]) -> list[dict]:
    return [
        {
            "accountId": item.get("accountId"),
            "action": "auto_sequence" if int(item.get("days_to_renewal", 999)) <= 90 else "monitor",
        }
        for item in renewals
    ]
