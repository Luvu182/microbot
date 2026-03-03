"""WebSocket chat endpoint — /ws/chat/{session_key}.

Protocol (client → server):
  {"type": "auth", "token": "..."}        — optional if token already in header/query
  {"type": "message", "content": "..."}  — send message to agent
  {"type": "stop"}                        — request agent stop (best-effort)
  {"type": "new_session"}                 — reset session history

Protocol (server → client):
  {"type": "auth_ok"}
  {"type": "progress", "content": "..."}
  {"type": "tool_hint", "content": "..."}
  {"type": "response", "content": "..."}
  {"type": "error", "content": "..."}
  {"type": "queued"}                       — message is queued (agent busy)
"""

from __future__ import annotations

import re

from loguru import logger
from starlette.websockets import WebSocket, WebSocketDisconnect

# Validate session keys from URL — alphanumeric, hyphen, underscore, colon only
_SAFE_SESSION_KEY = re.compile(r"^[a-zA-Z0-9_:\-]{1,128}$")


def _validate_session_key(key: str) -> bool:
    """Return True if session key passes safety checks."""
    return bool(_SAFE_SESSION_KEY.match(key))


async def _ws_send(ws: WebSocket, msg_type: str, content: str = "") -> None:
    """Helper — send a typed JSON frame, swallowing send errors on disconnect."""
    try:
        payload: dict = {"type": msg_type}
        if content:
            payload["content"] = content
        await ws.send_json(payload)
    except Exception:
        pass  # Client disconnected; caller handles cleanup


async def chat_ws_endpoint(websocket: WebSocket) -> None:
    """Handle a single WebSocket chat connection.

    The WebChannel instance is stored in websocket.app.state.web_channel
    and provides handle_websocket() which drives the inbound loop.
    """
    session_key: str = websocket.path_params.get("session_key", "")

    if not _validate_session_key(session_key):
        await websocket.close(code=1008, reason="invalid session key")
        return

    web_channel = getattr(websocket.app.state, "web_channel", None)
    if web_channel is None:
        await websocket.close(code=1011, reason="web channel not ready")
        return

    config = getattr(websocket.app.state, "config", None)
    required_token: str = config.gateway.web.token if config else ""

    # Validate token BEFORE accepting the connection (during upgrade)
    if required_token:
        provided = websocket.query_params.get("token") or websocket.headers.get("authorization", "")
        if provided.lower().startswith("bearer "):
            provided = provided[7:].strip()
        if provided != required_token:
            await websocket.close(code=4001, reason="unauthorized")
            return

    await websocket.accept()
    logger.info("WebSocket connected: session={}", session_key)

    try:
        await web_channel.handle_websocket(websocket, session_key)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: session={}", session_key)
    except Exception as e:
        logger.error("WebSocket error for session {}: {}", session_key, e)
        await _ws_send(websocket, "error", str(e))
    finally:
        web_channel.unregister(session_key)
        logger.debug("WebSocket cleaned up: session={}", session_key)
