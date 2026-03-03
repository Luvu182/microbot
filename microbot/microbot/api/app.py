"""Starlette ASGI application factory for microbot web API.

Creates a Starlette app with:
- WebSocket endpoint: /ws/chat/{session_key}
- REST endpoints: /api/*
- Static file serving: / (React build, optional — skipped if not built)
- CORS middleware
- Token auth middleware
"""

from __future__ import annotations

from pathlib import Path

from loguru import logger
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.routing import Mount, Route, WebSocketRoute
from starlette.staticfiles import StaticFiles

from microbot.api.auth import TokenAuthMiddleware
from microbot.api.routes_api import build_api_routes
from microbot.api.routes_chat import chat_ws_endpoint


def create_app(
    agent_loop,
    session_manager,
    channel_manager,
    cron,
    config,
    web_channel,
) -> Starlette:
    """Assemble and return the Starlette ASGI application.

    Args:
        agent_loop: The running AgentLoop instance.
        session_manager: SessionManager for session history.
        channel_manager: ChannelManager for channel status.
        cron: CronService for scheduled jobs.
        config: Root Config object.
        web_channel: WebChannel instance (manages WS connections).
    """
    web_cfg = config.gateway.web

    # Build route list
    routes: list[Route | WebSocketRoute | Mount] = [
        WebSocketRoute("/ws/chat/{session_key}", chat_ws_endpoint),
        *build_api_routes(),
    ]

    # Serve React build if available (graceful degradation if not built)
    # web/ lives at the repo root, two levels above this file (microbot/api/app.py)
    web_dist = Path(__file__).parent.parent.parent / "web" / "dist"
    if web_dist.exists():
        routes.append(Mount("/", StaticFiles(directory=str(web_dist), html=True)))
        logger.info("Serving web UI from {}", web_dist)
    else:
        logger.warning(
            "Web UI not built (expected at {}). "
            "Skipping static file serving — API still available.",
            web_dist,
        )

    middleware = [
        Middleware(
            CORSMiddleware,
            allow_origins=web_cfg.cors_origins,
            allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type"],
        ),
        Middleware(TokenAuthMiddleware, token=web_cfg.token),
    ]

    app = Starlette(routes=routes, middleware=middleware)

    # Attach shared state so route handlers can access services
    app.state.agent_loop = agent_loop
    app.state.session_manager = session_manager
    app.state.channel_manager = channel_manager
    app.state.cron = cron
    app.state.config = config
    app.state.web_channel = web_channel

    return app
