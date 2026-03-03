"""Zalo channel implementation using Node.js bridge."""

import asyncio
import json
from collections import OrderedDict

from loguru import logger

from microbot.bus.events import OutboundMessage
from microbot.bus.queue import MessageBus
from microbot.channels.base import BaseChannel
from microbot.config.schema import ZaloConfig


class ZaloChannel(BaseChannel):
    """
    Zalo channel that connects to a Node.js bridge.

    The bridge uses zca-js to handle the Zalo Web protocol.
    Communication between Python and Node.js is via WebSocket.
    """

    name = "zalo"

    def __init__(self, config: ZaloConfig, bus: MessageBus):
        super().__init__(config, bus)
        self.config: ZaloConfig = config
        self._ws = None
        self._connected = False
        self._processed_message_ids: OrderedDict[str, None] = OrderedDict()
        self._last_qr: str | None = None
        self._zalo_status: str = "disconnected"

    async def start(self) -> None:
        """Start the Zalo channel by connecting to the bridge."""
        import websockets

        bridge_url = self.config.bridge_url
        logger.info("Connecting to Zalo bridge at {}...", bridge_url)
        self._running = True

        while self._running:
            try:
                async with websockets.connect(bridge_url) as ws:
                    self._ws = ws
                    if self.config.bridge_token:
                        await ws.send(json.dumps({
                            "type": "auth",
                            "token": self.config.bridge_token,
                        }))
                    self._connected = True
                    logger.info("Connected to Zalo bridge")

                    async for message in ws:
                        try:
                            await self._handle_bridge_message(message)
                        except Exception as e:
                            logger.error("Error handling bridge message: {}", e)

            except asyncio.CancelledError:
                break
            except Exception as e:
                self._connected = False
                self._ws = None
                logger.warning("Zalo bridge connection error: {}", e)
                if self._running:
                    logger.info("Reconnecting in 5 seconds...")
                    await asyncio.sleep(5)

    async def stop(self) -> None:
        """Stop the Zalo channel."""
        self._running = False
        self._connected = False
        if self._ws:
            await self._ws.close()
            self._ws = None

    async def send(self, msg: OutboundMessage) -> None:
        """Send a message through Zalo."""
        if not self._ws or not self._connected:
            logger.warning("Zalo bridge not connected")
            return

        try:
            is_group = msg.metadata.get("is_group", False)
            payload = {
                "type": "send",
                "to": msg.chat_id,
                "text": msg.content,
                "isGroup": is_group,
            }
            await self._ws.send(json.dumps(payload, ensure_ascii=False))
        except Exception as e:
            logger.error("Error sending Zalo message: {}", e)

    async def _handle_bridge_message(self, raw: str) -> None:
        """Handle a message from the bridge."""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Invalid JSON from bridge: {}", raw[:100])
            return

        msg_type = data.get("type")

        if msg_type == "message":
            sender = data.get("sender", "")
            content = data.get("content", "")
            message_id = data.get("id", "")
            thread_id = data.get("threadId", "")
            is_group = data.get("isGroup", False)

            # Dedup by message ID
            if message_id:
                if message_id in self._processed_message_ids:
                    return
                self._processed_message_ids[message_id] = None
                while len(self._processed_message_ids) > 1000:
                    self._processed_message_ids.popitem(last=False)

            sender_id = str(sender)
            chat_id = thread_id if thread_id else sender_id

            await self._handle_message(
                sender_id=sender_id,
                chat_id=chat_id,
                content=content,
                metadata={
                    "message_id": message_id,
                    "timestamp": data.get("timestamp"),
                    "is_group": is_group,
                    "msg_type": data.get("msgType", ""),
                    "sender_name": data.get("senderName", ""),
                },
            )

        elif msg_type == "status":
            status = data.get("status")
            logger.info("Zalo status: {}", status)
            if status == "connected":
                self._connected = True
                self._zalo_status = "connected"
                self._last_qr = None  # clear QR once connected
            elif status == "disconnected":
                self._connected = False
                self._zalo_status = "disconnected"
            else:
                self._zalo_status = status or "disconnected"

        elif msg_type == "qr":
            qr_string = data.get("qr", "")
            self._last_qr = qr_string
            self._zalo_status = "qr_pending"
            logger.info("Zalo QR code received — scan in web UI or bridge terminal")

        elif msg_type == "response":
            # Successful command response from bridge (fire-and-forget for channel)
            pass

        elif msg_type == "error":
            command = data.get("command")
            error_msg = data.get("error", "unknown error")
            if command:
                # Error response to a specific command
                logger.error("Zalo bridge command '{}' error: {}", command, error_msg)
            else:
                logger.error("Zalo bridge error: {}", error_msg)
