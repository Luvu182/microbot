"""WebChannel — browser WebSocket chat channel.

Differences from other channels:
- Connections are managed by Starlette (ASGI), not by start()
- start() blocks on an asyncio.Event so ChannelManager.start_all() keeps the task alive
- Outbound routing handled by ChannelManager._dispatch_outbound() (web channel is exempt
  from global send_progress / send_tool_hints filter — web always receives all events)
- Session keys from WS URL are validated before use (see routes_chat.py)
"""

from __future__ import annotations

import asyncio

from loguru import logger
from starlette.websockets import WebSocket, WebSocketDisconnect, WebSocketState

from nanobot.bus.events import OutboundMessage
from nanobot.bus.queue import MessageBus
from nanobot.channels.base import BaseChannel
from nanobot.config.schema import WebConfig


class WebChannel(BaseChannel):
    """WebSocket-based channel for the browser web UI.

    Lifecycle:
      1. Gateway creates WebChannel and ChannelManager registers it.
      2. ChannelManager.start_all() calls start() — blocks until stop().
      3. Each browser WS connection calls handle_websocket() via routes_chat.py.
      4. ChannelManager._dispatch_outbound() calls send() to deliver agent responses.
      5. stop() closes all open connections and unblocks start().
    """

    name = "web"

    def __init__(self, config: WebConfig, bus: MessageBus):
        super().__init__(config, bus)
        self.config: WebConfig = config
        # session_key → WebSocket mapping for active connections
        self._connections: dict[str, WebSocket] = {}
        self._stop_event = asyncio.Event()

    # ------------------------------------------------------------------
    # BaseChannel interface
    # ------------------------------------------------------------------

    async def start(self) -> None:
        """Block until stop() is called.

        ChannelManager.start_all() runs each channel.start() as an asyncio task;
        returning immediately would complete the task and break the gather() pattern.
        """
        self._running = True
        self._stop_event.clear()
        logger.info("WebChannel started — waiting for connections")
        await self._stop_event.wait()

    async def stop(self) -> None:
        """Close all WebSocket connections and unblock start()."""
        self._running = False

        for key, ws in list(self._connections.items()):
            try:
                if ws.client_state == WebSocketState.CONNECTED:
                    await ws.close(code=1001, reason="server shutdown")
            except Exception:
                pass
        self._connections.clear()

        self._stop_event.set()
        logger.info("WebChannel stopped")

    async def send(self, msg: OutboundMessage) -> None:
        """Send an outbound message to the correct WebSocket by chat_id.

        Called by ChannelManager._dispatch_outbound() for messages where channel == 'web'.
        Web channel always receives progress and tool_hint events (filter bypassed in manager).
        """
        ws = self._connections.get(msg.chat_id)
        if ws is None:
            logger.debug("WebChannel: no connection for session {}", msg.chat_id)
            return

        is_progress = msg.metadata.get("_progress", False)
        is_tool_hint = msg.metadata.get("_tool_hint", False)

        if is_progress:
            msg_type = "tool_hint" if is_tool_hint else "progress"
        else:
            msg_type = "response"

        try:
            if ws.client_state == WebSocketState.CONNECTED:
                await ws.send_json({"type": msg_type, "content": msg.content})
        except WebSocketDisconnect:
            logger.debug("WebChannel: client disconnected during send for {}", msg.chat_id)
            self._connections.pop(msg.chat_id, None)
        except Exception as e:
            logger.warning("WebChannel send error for {}: {}", msg.chat_id, e)
            self._connections.pop(msg.chat_id, None)

    # ------------------------------------------------------------------
    # WebSocket connection handler (called from routes_chat.py)
    # ------------------------------------------------------------------

    async def handle_websocket(self, ws: WebSocket, session_key: str) -> None:
        """Drive a single WebSocket connection until it closes.

        Registers the connection, reads client messages in a loop,
        and publishes them to the inbound bus.
        """
        self._connections[session_key] = ws
        logger.debug("WebChannel: registered session {}", session_key)

        try:
            while True:
                try:
                    data = await ws.receive_json()
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    logger.warning("WebChannel receive error for {}: {}", session_key, e)
                    break

                msg_type = data.get("type", "")

                if msg_type == "message":
                    content = data.get("content", "").strip()
                    if not content:
                        continue
                    await self._handle_message(
                        sender_id="web",
                        chat_id=session_key,
                        content=content,
                        session_key=session_key,
                    )

                elif msg_type == "new_session":
                    # /new command resets the session via AgentLoop
                    await self._handle_message(
                        sender_id="web",
                        chat_id=session_key,
                        content="/new",
                        session_key=session_key,
                    )

                elif msg_type == "stop":
                    logger.debug("WebChannel: stop requested for {}", session_key)
                    # Agent loop finishes current turn; no direct interrupt in v1

                elif msg_type == "auth":
                    # Token already validated at upgrade time; just ack
                    await ws.send_json({"type": "auth_ok"})

                else:
                    logger.debug(
                        "WebChannel: unknown message type '{}' from {}",
                        msg_type, session_key,
                    )

        finally:
            self._connections.pop(session_key, None)
            logger.debug("WebChannel: unregistered session {}", session_key)

    def unregister(self, session_key: str) -> None:
        """Remove a session connection (called from route handler on cleanup)."""
        self._connections.pop(session_key, None)
