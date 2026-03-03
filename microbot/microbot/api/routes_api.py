"""REST API endpoints for microbot web UI.

Endpoints:
  GET  /api/status                 — health check
  GET  /api/sessions               — list sessions
  GET  /api/sessions/{key}         — session history
  DELETE /api/sessions/{key}       — clear session
  GET  /api/channels               — channel status
  GET  /api/config                 — masked config (no secrets)
  PUT  /api/config                 — update config (rejects masked values)
  GET  /api/cron                   — list cron jobs
  POST /api/cron                   — add cron job
  DELETE /api/cron/{id}            — remove cron job
"""

from __future__ import annotations

import re
from typing import Any

from loguru import logger
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from microbot import __version__

# Allowed session key characters — same regex as routes_chat.py
_SAFE_SESSION_KEY = re.compile(r"^[a-zA-Z0-9_:\-]{1,128}$")

# Sensitive field name substrings — never expose their values
_SECRET_FIELDS = {"api_key", "token", "secret", "password", "access_token",
                  "app_secret", "client_secret", "encrypt_key", "verification_token",
                  "bridge_token", "imap_password", "smtp_password", "bot_token",
                  "app_token", "claw_token"}


def _mask_config(data: Any) -> Any:
    """Recursively mask sensitive fields with '***'."""
    if isinstance(data, dict):
        return {
            k: "***" if any(s in k.lower() for s in _SECRET_FIELDS) else _mask_config(v)
            for k, v in data.items()
        }
    if isinstance(data, list):
        return [_mask_config(item) for item in data]
    return data


def _merge_config(base: dict, updates: dict) -> dict:
    """Deep-merge updates into base, skipping masked ('***') values."""
    result = dict(base)
    for k, v in updates.items():
        if v == "***":
            continue  # skip masked placeholders — keep original secret
        if isinstance(v, dict) and isinstance(result.get(k), dict):
            result[k] = _merge_config(result[k], v)
        else:
            result[k] = v
    return result


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------

async def status_endpoint(request: Request) -> JSONResponse:
    """GET /api/status — health check."""
    return JSONResponse({
        "status": "ok",
        "version": __version__,
    })


async def sessions_list_endpoint(request: Request) -> JSONResponse:
    """GET /api/sessions — list all sessions."""
    session_manager = request.app.state.session_manager
    if session_manager is None:
        return JSONResponse({"sessions": []})
    sessions = session_manager.list_sessions()
    return JSONResponse({"sessions": sessions})


async def session_detail_endpoint(request: Request) -> JSONResponse:
    """GET /api/sessions/{key} — get session history."""
    key = request.path_params["key"]
    if not _SAFE_SESSION_KEY.match(key):
        return JSONResponse({"error": "invalid session key"}, status_code=400)
    session_manager = request.app.state.session_manager
    if session_manager is None:
        return JSONResponse({"error": "session manager unavailable"}, status_code=503)
    session = session_manager.get_or_create(key)
    return JSONResponse({
        "key": session.key,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
        "messages": session.messages,
    })


async def session_delete_endpoint(request: Request) -> JSONResponse:
    """DELETE /api/sessions/{key} — clear session history."""
    key = request.path_params["key"]
    if not _SAFE_SESSION_KEY.match(key):
        return JSONResponse({"error": "invalid session key"}, status_code=400)
    session_manager = request.app.state.session_manager
    if session_manager is None:
        return JSONResponse({"error": "session manager unavailable"}, status_code=503)
    session = session_manager.get_or_create(key)
    session.clear()
    session_manager.save(session)
    return JSONResponse({"deleted": key})


async def channels_endpoint(request: Request) -> JSONResponse:
    """GET /api/channels — channel status as array matching frontend ApiChannel shape."""
    channel_manager = request.app.state.channel_manager
    if channel_manager is None:
        return JSONResponse({"channels": []})
    raw: dict = channel_manager.get_status()
    channels = [
        {
            "name": k,
            "enabled": v.get("enabled", False),
            "running": v.get("running", False),
            "status": "running" if v.get("running") else "stopped",
        }
        for k, v in raw.items()
    ]
    return JSONResponse({"channels": channels})


async def config_get_endpoint(request: Request) -> JSONResponse:
    """GET /api/config — masked config (no secrets)."""
    config = request.app.state.config
    raw = config.model_dump(by_alias=True)
    # Remove the web.token from exposure (it IS a secret)
    masked = _mask_config(raw)
    return JSONResponse({"config": masked})


async def config_put_endpoint(request: Request) -> JSONResponse:
    """PUT /api/config — update config, skip masked fields."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "invalid JSON"}, status_code=400)

    config = request.app.state.config
    current_raw = config.model_dump(by_alias=True)
    merged = _merge_config(current_raw, body)

    try:
        from microbot.config.schema import Config
        new_config = Config.model_validate(merged)
    except Exception as e:
        return JSONResponse({"error": f"invalid config: {e}"}, status_code=422)

    # Prevent clearing the web auth token via API (would disable auth for everyone)
    original_token = (
        getattr(getattr(config, "gateway", None), "web", None) and
        config.gateway.web.token  # type: ignore[union-attr]
    )
    new_token = (
        getattr(getattr(new_config, "gateway", None), "web", None) and
        new_config.gateway.web.token  # type: ignore[union-attr]
    )
    if original_token and not new_token:
        new_config.gateway.web.token = original_token  # type: ignore[union-attr]

    # Persist to disk
    try:
        from microbot.config.loader import save_config
        save_config(new_config)
    except Exception as e:
        logger.error("Failed to save config: {}", e)
        return JSONResponse({"error": "failed to save config"}, status_code=500)

    # Update in-memory config reference on app state
    request.app.state.config = new_config
    return JSONResponse({"saved": True})


_VALID_CHANNEL_NAME = re.compile(r"^[a-z]{2,20}$")


async def bridge_status_endpoint(request: Request) -> JSONResponse:
    """GET /api/bridge/{channel}/status — bridge channel connection status and QR code."""
    channel_name = request.path_params["channel"]
    if not _VALID_CHANNEL_NAME.match(channel_name):
        return JSONResponse({"error": "invalid channel name"}, status_code=400)
    channel_manager = request.app.state.channel_manager
    if channel_manager is None:
        return JSONResponse({"error": "channel manager unavailable"}, status_code=503)
    status = channel_manager.get_bridge_channel_status(channel_name)
    if status is None:
        return JSONResponse({"error": "channel not enabled"}, status_code=404)
    return JSONResponse(status)


async def zalo_status_endpoint(request: Request) -> JSONResponse:
    """GET /api/zalo/status — Zalo connection status (backward compat)."""
    channel_manager = request.app.state.channel_manager
    if channel_manager is None:
        return JSONResponse({"error": "channel manager unavailable"}, status_code=503)
    status = channel_manager.get_zalo_status()
    if status is None:
        return JSONResponse({"error": "zalo channel not enabled"}, status_code=404)
    return JSONResponse(status)


async def cron_list_endpoint(request: Request) -> JSONResponse:
    """GET /api/cron — list scheduled jobs."""
    cron = request.app.state.cron
    jobs = cron.list_jobs(include_disabled=True)
    return JSONResponse({"jobs": [_job_to_dict(j) for j in jobs]})


async def cron_add_endpoint(request: Request) -> JSONResponse:
    """POST /api/cron — add a scheduled job."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "invalid JSON"}, status_code=400)

    cron = request.app.state.cron
    try:
        from microbot.cron.types import CronSchedule
        schedule = CronSchedule.model_validate(body.get("schedule", {}))
        job = cron.add_job(
            name=body.get("name", "web-job"),
            schedule=schedule,
            message=body.get("message", ""),
            deliver=body.get("deliver", False),
            to=body.get("to"),
            channel=body.get("channel"),
        )
        return JSONResponse({"job": _job_to_dict(job)}, status_code=201)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=422)
    except Exception as e:
        logger.error("Failed to add cron job: {}", e)
        return JSONResponse({"error": "internal error"}, status_code=500)


async def cron_delete_endpoint(request: Request) -> JSONResponse:
    """DELETE /api/cron/{id} — remove a scheduled job."""
    job_id = request.path_params["id"]
    cron = request.app.state.cron
    if cron.remove_job(job_id):
        return JSONResponse({"deleted": job_id})
    return JSONResponse({"error": "job not found"}, status_code=404)


def _job_to_dict(job: Any) -> dict:
    """Serialize a CronJob to a plain dict for JSON response."""
    return {
        "id": job.id,
        "name": job.name,
        "enabled": job.enabled,
        "schedule": job.schedule.model_dump(),
        "payload": job.payload.model_dump(),
        "state": {
            "next_run_at_ms": job.state.next_run_at_ms,
        },
    }


# ---------------------------------------------------------------------------
# Route table (imported by app.py)
# ---------------------------------------------------------------------------

def build_api_routes() -> list[Route]:
    """Return list of Starlette Route objects for the REST API."""
    return [
        Route("/api/status", status_endpoint, methods=["GET"]),
        Route("/api/sessions", sessions_list_endpoint, methods=["GET"]),
        Route("/api/sessions/{key:path}", session_detail_endpoint, methods=["GET"]),
        Route("/api/sessions/{key:path}", session_delete_endpoint, methods=["DELETE"]),
        Route("/api/channels", channels_endpoint, methods=["GET"]),
        Route("/api/bridge/{channel}/status", bridge_status_endpoint, methods=["GET"]),
        Route("/api/zalo/status", zalo_status_endpoint, methods=["GET"]),
        Route("/api/config", config_get_endpoint, methods=["GET"]),
        Route("/api/config", config_put_endpoint, methods=["PUT"]),
        Route("/api/cron", cron_list_endpoint, methods=["GET"]),
        Route("/api/cron", cron_add_endpoint, methods=["POST"]),
        Route("/api/cron/{id}", cron_delete_endpoint, methods=["DELETE"]),
    ]
