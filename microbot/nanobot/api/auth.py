"""Token authentication middleware for the web API.

Validates Bearer token on every HTTP request and WebSocket upgrade.
If web.token is empty, all requests are allowed (localhost-only mode).
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# Paths that are always public (no auth required)
_PUBLIC_PATHS = {"/api/status"}


def _extract_bearer(request: Request) -> str | None:
    """Extract token from Authorization header or ?token= query param."""
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return request.query_params.get("token")


class TokenAuthMiddleware(BaseHTTPMiddleware):
    """Reject requests that lack a valid Bearer token.

    Skipped when config.gateway.web.token is empty (open/localhost mode).
    WebSocket upgrades carry the token via ?token= query parameter.
    """

    def __init__(self, app, token: str):
        super().__init__(app)
        self._token = token

    async def dispatch(self, request: Request, call_next):
        # No token configured — open access
        if not self._token:
            return await call_next(request)

        # Public paths skip auth
        if request.url.path in _PUBLIC_PATHS:
            return await call_next(request)

        provided = _extract_bearer(request)
        if provided != self._token:
            return JSONResponse(
                {"error": "Unauthorized"},
                status_code=401,
                headers={"WWW-Authenticate": "Bearer"},
            )

        return await call_next(request)
