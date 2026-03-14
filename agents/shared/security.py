import os
import secrets

from fastapi import HTTPException


def validate_internal_service_token(x_service_token: str | None) -> None:
    """Validates internal service token when INTERNAL_SERVICE_TOKEN is configured.

    If the environment variable is not set, validation is skipped to preserve local/dev ergonomics.
    """
    expected = os.getenv("INTERNAL_SERVICE_TOKEN")
    if not expected:
        return

    provided = (x_service_token or "").strip()
    if not provided or not secrets.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="Invalid internal service token")
