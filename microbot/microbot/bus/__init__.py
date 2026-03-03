"""Message bus module for decoupled channel-agent communication."""

from microbot.bus.events import InboundMessage, OutboundMessage
from microbot.bus.queue import MessageBus

__all__ = ["MessageBus", "InboundMessage", "OutboundMessage"]
