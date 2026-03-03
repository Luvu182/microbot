"""Channel manager for coordinating chat channels."""

from __future__ import annotations

import asyncio
from typing import Any

from loguru import logger

from microbot.bus.events import OutboundMessage
from microbot.bus.queue import MessageBus
from microbot.channels.base import BaseChannel
from microbot.config.schema import Config


class ChannelManager:
    """
    Manages chat channels and coordinates message routing.

    Responsibilities:
    - Initialize enabled channels (Telegram, WhatsApp, etc.)
    - Start/stop channels
    - Route outbound messages
    """

    def __init__(self, config: Config, bus: MessageBus):
        self.config = config
        self.bus = bus
        self.channels: dict[str, BaseChannel] = {}
        self._dispatch_task: asyncio.Task | None = None

        self._init_channels()

    def _init_channels(self) -> None:
        """Initialize channels based on config."""

        # Web channel (always registered when gateway.web.enabled)
        if self.config.gateway.web.enabled:
            try:
                from microbot.channels.web import WebChannel
                self.channels["web"] = WebChannel(
                    self.config.gateway.web,
                    self.bus,
                )
                logger.info("Web channel enabled")
            except ImportError as e:
                logger.warning("Web channel not available: {}", e)

        # Telegram channel
        if self.config.channels.telegram.enabled:
            try:
                from microbot.channels.telegram import TelegramChannel
                self.channels["telegram"] = TelegramChannel(
                    self.config.channels.telegram,
                    self.bus,
                    groq_api_key=self.config.providers.groq.api_key,
                )
                logger.info("Telegram channel enabled")
            except ImportError as e:
                logger.warning("Telegram channel not available: {}", e)

        # WhatsApp channel
        if self.config.channels.whatsapp.enabled:
            try:
                from microbot.channels.whatsapp import WhatsAppChannel
                self.channels["whatsapp"] = WhatsAppChannel(
                    self.config.channels.whatsapp, self.bus
                )
                logger.info("WhatsApp channel enabled")
            except ImportError as e:
                logger.warning("WhatsApp channel not available: {}", e)

        # Discord channel
        if self.config.channels.discord.enabled:
            try:
                from microbot.channels.discord import DiscordChannel
                self.channels["discord"] = DiscordChannel(
                    self.config.channels.discord, self.bus
                )
                logger.info("Discord channel enabled")
            except ImportError as e:
                logger.warning("Discord channel not available: {}", e)

        # Feishu channel
        if self.config.channels.feishu.enabled:
            try:
                from microbot.channels.feishu import FeishuChannel
                self.channels["feishu"] = FeishuChannel(
                    self.config.channels.feishu, self.bus
                )
                logger.info("Feishu channel enabled")
            except ImportError as e:
                logger.warning("Feishu channel not available: {}", e)

        # Mochat channel
        if self.config.channels.mochat.enabled:
            try:
                from microbot.channels.mochat import MochatChannel

                self.channels["mochat"] = MochatChannel(
                    self.config.channels.mochat, self.bus
                )
                logger.info("Mochat channel enabled")
            except ImportError as e:
                logger.warning("Mochat channel not available: {}", e)

        # DingTalk channel
        if self.config.channels.dingtalk.enabled:
            try:
                from microbot.channels.dingtalk import DingTalkChannel
                self.channels["dingtalk"] = DingTalkChannel(
                    self.config.channels.dingtalk, self.bus
                )
                logger.info("DingTalk channel enabled")
            except ImportError as e:
                logger.warning("DingTalk channel not available: {}", e)

        # Email channel
        if self.config.channels.email.enabled:
            try:
                from microbot.channels.email import EmailChannel
                self.channels["email"] = EmailChannel(
                    self.config.channels.email, self.bus
                )
                logger.info("Email channel enabled")
            except ImportError as e:
                logger.warning("Email channel not available: {}", e)

        # Slack channel
        if self.config.channels.slack.enabled:
            try:
                from microbot.channels.slack import SlackChannel
                self.channels["slack"] = SlackChannel(
                    self.config.channels.slack, self.bus
                )
                logger.info("Slack channel enabled")
            except ImportError as e:
                logger.warning("Slack channel not available: {}", e)

        # QQ channel
        if self.config.channels.qq.enabled:
            try:
                from microbot.channels.qq import QQChannel
                self.channels["qq"] = QQChannel(
                    self.config.channels.qq,
                    self.bus,
                )
                logger.info("QQ channel enabled")
            except ImportError as e:
                logger.warning("QQ channel not available: {}", e)

        # Matrix channel
        if self.config.channels.matrix.enabled:
            try:
                from microbot.channels.matrix import MatrixChannel
                self.channels["matrix"] = MatrixChannel(
                    self.config.channels.matrix,
                    self.bus,
                )
                logger.info("Matrix channel enabled")
            except ImportError as e:
                logger.warning("Matrix channel not available: {}", e)

        # Zalo channel
        if self.config.channels.zalo.enabled:
            try:
                from microbot.channels.zalo import ZaloChannel
                self.channels["zalo"] = ZaloChannel(
                    self.config.channels.zalo, self.bus
                )
                logger.info("Zalo channel enabled")
            except ImportError as e:
                logger.warning("Zalo channel not available: {}", e)

        self._validate_allow_from()

    def _validate_allow_from(self) -> None:
        for name, ch in self.channels.items():
            if getattr(ch.config, "allow_from", None) == []:
                raise SystemExit(
                    f'Error: "{name}" has empty allowFrom (denies all). '
                    f'Set ["*"] to allow everyone, or add specific user IDs.'
                )

    async def _start_channel(self, name: str, channel: BaseChannel) -> None:
        """Start a channel and log any exceptions."""
        try:
            await channel.start()
        except Exception as e:
            logger.error("Failed to start channel {}: {}", name, e)

    async def start_all(self) -> None:
        """Start all channels and the outbound dispatcher."""
        if not self.channels:
            logger.warning("No channels enabled")
            # Still need to drain the outbound queue so it doesn't accumulate
            # messages forever when web-only mode is used without other channels.
            self._dispatch_task = asyncio.create_task(self._dispatch_outbound())
            await self._dispatch_task
            return

        # Always start outbound dispatcher regardless of channel count
        self._dispatch_task = asyncio.create_task(self._dispatch_outbound())

        # Start channels
        tasks = []
        for name, channel in self.channels.items():
            logger.info("Starting {} channel...", name)
            tasks.append(asyncio.create_task(self._start_channel(name, channel)))

        # Wait for all to complete (they should run forever)
        await asyncio.gather(*tasks, return_exceptions=True)

    async def stop_all(self) -> None:
        """Stop all channels and the dispatcher."""
        logger.info("Stopping all channels...")

        # Stop dispatcher
        if self._dispatch_task:
            self._dispatch_task.cancel()
            try:
                await self._dispatch_task
            except asyncio.CancelledError:
                pass

        # Stop all channels
        for name, channel in self.channels.items():
            try:
                await channel.stop()
                logger.info("Stopped {} channel", name)
            except Exception as e:
                logger.error("Error stopping {}: {}", name, e)

    async def _dispatch_outbound(self) -> None:
        """Dispatch outbound messages to the appropriate channel."""
        logger.info("Outbound dispatcher started")

        while True:
            try:
                msg = await asyncio.wait_for(
                    self.bus.consume_outbound(),
                    timeout=1.0
                )

                # Web channel always receives progress/tool_hint regardless of global flags
                # (global flags are only for non-web channels like Telegram/Discord)
                if msg.metadata.get("_progress") and msg.channel != "web":
                    if msg.metadata.get("_tool_hint") and not self.config.channels.send_tool_hints:
                        continue
                    if not msg.metadata.get("_tool_hint") and not self.config.channels.send_progress:
                        continue

                channel = self.channels.get(msg.channel)
                if channel:
                    try:
                        await channel.send(msg)
                    except Exception as e:
                        logger.error("Error sending to {}: {}", msg.channel, e)
                else:
                    logger.warning("Unknown channel: {}", msg.channel)

            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break

    def get_channel(self, name: str) -> BaseChannel | None:
        """Get a channel by name."""
        return self.channels.get(name)

    def get_status(self) -> dict[str, Any]:
        """Get status of all channels."""
        return {
            name: {
                "enabled": True,
                "running": channel.is_running
            }
            for name, channel in self.channels.items()
        }

    def get_bridge_channel_status(self, name: str) -> dict | None:
        """Return bridge channel connection status and QR string, or None if not enabled."""
        channel = self.channels.get(name)
        if channel is None:
            return None
        qr = getattr(channel, "_last_qr", None)
        # Each bridge channel stores status as _{name}_status (e.g. _zalo_status, _whatsapp_status)
        status = getattr(channel, f"_{name}_status", None) or (
            "connected" if getattr(channel, "_connected", False) else "disconnected"
        )
        return {"qr": qr, "status": status}

    def get_zalo_status(self) -> dict | None:
        """Return Zalo connection status — backward compat wrapper."""
        return self.get_bridge_channel_status("zalo")

    @property
    def enabled_channels(self) -> list[str]:
        """Get list of enabled channel names."""
        return list(self.channels.keys())
