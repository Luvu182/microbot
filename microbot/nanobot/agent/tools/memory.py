"""Memory search and recall tools (kioku-lite backend)."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

from nanobot.agent.tools.base import Tool

if TYPE_CHECKING:
    from nanobot.agent.memory import MemoryStore


class MemorySearchTool(Tool):
    """Hybrid search across memory: BM25 + vector + knowledge graph."""

    def __init__(self, memory_store: MemoryStore):
        self._memory = memory_store

    @property
    def name(self) -> str:
        return "search_memory"

    @property
    def description(self) -> str:
        return (
            "Search past memories using hybrid retrieval (keyword + semantic + graph). "
            "Returns relevant entries ranked by relevance. Use for recalling past events, "
            "decisions, or context from previous conversations."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Natural language search query.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results to return (default 10).",
                },
                "entities": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional entity names to focus the search on.",
                },
            },
            "required": ["query"],
        }

    async def execute(self, **kwargs: Any) -> str:
        query = kwargs["query"]
        limit = kwargs.get("limit", 10)
        entities = kwargs.get("entities")
        result = self._memory.search(query, limit=limit, entities=entities)
        if result is None:
            return "Memory search unavailable (kioku not initialized)."
        # Truncate content previews to keep tool result compact
        for r in result.get("results", []):
            if isinstance(r.get("content"), str) and len(r["content"]) > 200:
                r["content"] = r["content"][:200] + "..."
        return json.dumps(result, ensure_ascii=False, default=str)


class MemoryRecallTool(Tool):
    """Recall everything related to an entity via knowledge graph traversal."""

    def __init__(self, memory_store: MemoryStore):
        self._memory = memory_store

    @property
    def name(self) -> str:
        return "recall_entity"

    @property
    def description(self) -> str:
        return (
            "Recall all information about a specific entity (person, project, topic) "
            "by traversing the knowledge graph. Returns connected entities, relationships, "
            "and source memories."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "entity": {
                    "type": "string",
                    "description": "Entity name to recall (e.g. person, project, concept).",
                },
                "max_hops": {
                    "type": "integer",
                    "description": "Graph traversal depth (default 2).",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max related entities to return (default 10).",
                },
            },
            "required": ["entity"],
        }

    async def execute(self, **kwargs: Any) -> str:
        entity = kwargs["entity"]
        max_hops = kwargs.get("max_hops", 2)
        limit = kwargs.get("limit", 10)
        result = self._memory.recall_entity(entity, max_hops=max_hops, limit=limit)
        if result is None:
            return "Entity recall unavailable (kioku not initialized)."
        return json.dumps(result, ensure_ascii=False, default=str)
