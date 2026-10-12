"""Catch-all ASGI app that runs the REAL Piaxis API signature validator.

Used only by scripts/cross-check-api-signature.mjs. PYTHONPATH must point at an
export of piaxepay/piaxepay (security/, piaxis/, helpers/); the secret comes
from PIAXIS_XCHECK_SECRET (a generated throwaway test key).
"""

import os

from fastapi import HTTPException
from starlette.requests import Request
from starlette.responses import JSONResponse

from security.external_api_auth import validate_external_api_signature

SECRET = os.environ["PIAXIS_XCHECK_SECRET"]


async def app(scope, receive, send) -> None:
    # Plain ASGI catch-all: Starlette's "{rest:path}" route regex (".*") does not
    # match decoded newlines, whereas the validator only needs a Request.
    if scope["type"] != "http":
        return
    request = Request(scope, receive)
    try:
        await validate_external_api_signature(
            request=request, merchant_secret=SECRET, require_signature=True
        )
    except HTTPException as exc:
        response = JSONResponse(
            {"detail": exc.detail, "path": request.url.path}, status_code=exc.status_code
        )
    else:
        response = JSONResponse({"ok": True, "path": request.url.path})
    await response(scope, receive, send)
