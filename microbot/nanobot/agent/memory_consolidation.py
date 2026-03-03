"""Memory consolidation: LLM-powered summarization of old messages into memory storage."""

from __future__ import annotations

import hashlib
import json
from typing import TYPE_CHECKING

from loguru import logger

if TYPE_CHECKING:
    from nanobot.agent.memory import MemoryStore
    from nanobot.providers.base import LLMProvider
    from nanobot.session.manager import Session

# LLM tool schema for consolidation — includes optional entity/relationship extraction for KG
_SAVE_MEMORY_TOOL = [
    {
        "type": "function",
        "function": {
            "name": "save_memory",
            "description": "Save the memory consolidation result to persistent storage.",
            "parameters": {
                "type": "object",
                "properties": {
                    "history_entry": {
                        "type": "string",
                        "description": "A paragraph (2-5 sentences) summarizing key events/decisions/topics. "
                        "Start with [YYYY-MM-DD HH:MM]. Include detail useful for search.",
                    },
                    "memory_update": {
                        "type": "string",
                        "description": "Full updated long-term memory as markdown. Include all existing "
                        "facts plus new ones. Return unchanged if nothing new.",
                    },
                    "entities": {
                        "type": "array",
                        "description": "Key entities mentioned (people, projects, tools, concepts). Optional.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "type": {"type": "string", "enum": [
                                    "PERSON", "PROJECT", "TOOL", "CONCEPT", "ORG", "TOPIC",
                                ]},
                            },
                            "required": ["name", "type"],
                        },
                    },
                    "relationships": {
                        "type": "array",
                        "description": "Relationships between entities. Optional.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "source": {"type": "string"},
                                "target": {"type": "string"},
                                "rel_type": {"type": "string", "description": "e.g. WORKS_ON, USES, DEPENDS_ON"},
                                "evidence": {"type": "string", "description": "Brief supporting text"},
                            },
                            "required": ["source", "target", "rel_type"],
                        },
                    },
                },
                "required": ["history_entry", "memory_update"],
            },
        },
    }
]


async def consolidate_memory(
    store: MemoryStore,
    session: Session,
    provider: LLMProvider,
    model: str,
    *,
    archive_all: bool = False,
    memory_window: int = 50,
) -> bool:
    """Consolidate old messages into memory via LLM tool call.

    Saves history entry (kioku or HISTORY.md), updates MEMORY.md,
    and indexes entities/relationships in knowledge graph if available.

    Returns True on success (including no-op), False on failure.
    """
    if archive_all:
        old_messages = session.messages
        keep_count = 0
        logger.info("Memory consolidation (archive_all): {} messages", len(session.messages))
    else:
        keep_count = memory_window // 2
        if len(session.messages) <= keep_count:
            return True
        if len(session.messages) - session.last_consolidated <= 0:
            return True
        old_messages = session.messages[session.last_consolidated:-keep_count]
        if not old_messages:
            return True
        logger.info("Memory consolidation: {} to consolidate, {} keep", len(old_messages), keep_count)

    lines = []
    for m in old_messages:
        if not m.get("content"):
            continue
        tools = f" [tools: {', '.join(m['tools_used'])}]" if m.get("tools_used") else ""
        lines.append(f"[{m.get('timestamp', '?')[:16]}] {m['role'].upper()}{tools}: {m['content']}")

    current_memory = store.read_long_term()
    prompt = f"""Process this conversation and call the save_memory tool with your consolidation.

## Current Long-term Memory
{current_memory or "(empty)"}

## Conversation to Process
{chr(10).join(lines)}

Extract entities (people, projects, tools) and their relationships if any are mentioned."""

    try:
        response = await provider.chat(
            messages=[
                {"role": "system", "content": "You are a memory consolidation agent. Call the save_memory tool with your consolidation of the conversation."},
                {"role": "user", "content": prompt},
            ],
            tools=_SAVE_MEMORY_TOOL,
            model=model,
        )

        if not response.has_tool_calls:
            logger.warning("Memory consolidation: LLM did not call save_memory, skipping")
            return False

        args = response.tool_calls[0].arguments
        if isinstance(args, str):
            args = json.loads(args)
        if not isinstance(args, dict):
            logger.warning("Memory consolidation: unexpected arguments type {}", type(args).__name__)
            return False

        if entry := args.get("history_entry"):
            if not isinstance(entry, str):
                entry = json.dumps(entry, ensure_ascii=False)
            store.append_history(entry)
        if update := args.get("memory_update"):
            if not isinstance(update, str):
                update = json.dumps(update, ensure_ascii=False)
            if update != current_memory:
                store.write_long_term(update)

        # Index entities and relationships in knowledge graph
        if store.kioku and entry:
            entities_raw = args.get("entities")
            if isinstance(entities_raw, str):
                try:
                    entities_raw = json.loads(entities_raw)
                except json.JSONDecodeError:
                    entities_raw = None
            if entities_raw:
                content_hash = hashlib.sha256(entry.encode()).hexdigest()
                relationships = args.get("relationships", [])
                if isinstance(relationships, str):
                    try:
                        relationships = json.loads(relationships)
                    except json.JSONDecodeError:
                        relationships = []
                store.kg_index(content_hash, entities_raw, relationships)

        session.last_consolidated = 0 if archive_all else len(session.messages) - keep_count
        logger.info("Memory consolidation done: {} messages, last_consolidated={}", len(session.messages), session.last_consolidated)
        return True
    except Exception:
        logger.exception("Memory consolidation failed")
        return False
