"""Shared WebSocket client for Zalo bridge commands + base tool class."""

import asyncio
import json
import uuid
from typing import Any

from loguru import logger

from microbot.agent.tools.base import Tool


class ZaloBridgeClient:
    """
    Async WebSocket client for sending commands to the Zalo Node.js bridge.

    Connects lazily on first command. Matches request/response by requestId.
    Shared across all Zalo tools (single WS connection to bridge).
    """

    def __init__(self, bridge_url: str, bridge_token: str = ""):
        self._bridge_url = bridge_url
        self._bridge_token = bridge_token
        self._ws = None
        self._pending: dict[str, asyncio.Future] = {}
        self._listen_task: asyncio.Task | None = None

    async def _ensure_connected(self) -> None:
        """Connect to bridge if not already connected."""
        if self._ws is not None:
            return
        import websockets
        self._ws = await websockets.connect(self._bridge_url)
        if self._bridge_token:
            await self._ws.send(json.dumps({
                "type": "auth", "token": self._bridge_token,
            }))
        self._listen_task = asyncio.create_task(self._listen_loop())

    async def _listen_loop(self) -> None:
        """Background listener that routes responses to pending futures."""
        try:
            async for raw in self._ws:
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                req_id = data.get("requestId")
                if req_id and req_id in self._pending:
                    self._pending[req_id].set_result(data)
        except Exception as e:
            logger.debug("Zalo bridge client disconnected: {}", e)
            for fut in self._pending.values():
                if not fut.done():
                    fut.set_exception(ConnectionError("Bridge disconnected"))
            self._ws = None

    async def send_command(
        self, cmd_type: str, timeout: float = 30.0, **params: Any
    ) -> Any:
        """Send a command to the bridge and await response. Returns response data."""
        await self._ensure_connected()
        request_id = str(uuid.uuid4())[:8]
        cmd = {"requestId": request_id, "type": cmd_type, **params}

        future: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending[request_id] = future

        try:
            await self._ws.send(json.dumps(cmd, ensure_ascii=False))
            response = await asyncio.wait_for(future, timeout=timeout)
        except asyncio.TimeoutError:
            raise RuntimeError(f"Bridge command '{cmd_type}' timed out ({timeout}s)")
        finally:
            self._pending.pop(request_id, None)

        if response.get("type") == "error":
            raise RuntimeError(response.get("error", "Unknown bridge error"))
        return response.get("data")

    async def close(self) -> None:
        if self._listen_task:
            self._listen_task.cancel()
        if self._ws:
            await self._ws.close()
            self._ws = None


class ZaloBaseTool(Tool):
    """Base for all Zalo tools. Holds reference to shared bridge client."""

    def __init__(self, client: ZaloBridgeClient):
        self._client = client

    async def _cmd(self, cmd_type: str, **params: Any) -> str:
        """Send command and return JSON string result (truncated to 2000 chars)."""
        try:
            data = await self._client.send_command(cmd_type, **params)
            if isinstance(data, (dict, list)):
                return json.dumps(data, ensure_ascii=False, indent=2)[:2000]
            return str(data)[:2000]
        except Exception as e:
            return f"Error: {e}"
