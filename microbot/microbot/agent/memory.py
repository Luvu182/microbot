"""Memory system for persistent agent memory."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any

from loguru import logger

from microbot.utils.helpers import ensure_dir

try:
    from kioku_lite.service import KiokuLiteService
    from kioku_lite.config import Settings as KiokuSettings
    KIOKU_AVAILABLE = True
except ImportError:
    KiokuLiteService = None  # type: ignore[misc,assignment]
    KiokuSettings = None  # type: ignore[misc,assignment]
    KIOKU_AVAILABLE = False

if TYPE_CHECKING:
    from microbot.providers.base import LLMProvider
    from microbot.session.manager import Session


class MemoryStore:
    """Two-layer memory: MEMORY.md (curated) + kioku (search/KG) or HISTORY.md (fallback)."""

    def __init__(self, workspace: Path, *, kioku_config: dict[str, Any] | None = None):
        self.memory_dir = ensure_dir(workspace / "memory")
        self.memory_file = self.memory_dir / "MEMORY.md"
        self.history_file = self.memory_dir / "HISTORY.md"  # legacy fallback

        # Initialize kioku backend
        self.kioku: KiokuLiteService | None = None
        if KIOKU_AVAILABLE and (kioku_config is None or kioku_config.get("enabled", True)):
            try:
                cfg = kioku_config or {}
                settings = KiokuSettings(
                    memory_dir=self.memory_dir / "entries",
                    data_dir=self.memory_dir / "data",
                    embed_provider=cfg.get("embed_provider", "fastembed"),
                    embed_model=cfg.get("embed_model", "intfloat/multilingual-e5-large"),
                    embed_dim=cfg.get("embed_dim", 1024),
                    ollama_base_url=cfg.get("ollama_base_url", "http://localhost:11434"),
                )
                self.kioku = KiokuLiteService(settings)
                logger.info("Kioku memory backend initialized")
            except Exception as e:
                logger.warning("Kioku init failed, using file fallback: {}", e)

    def read_long_term(self) -> str:
        if self.memory_file.exists():
            return self.memory_file.read_text(encoding="utf-8")
        return ""

    def write_long_term(self, content: str) -> None:
        self.memory_file.write_text(content, encoding="utf-8")

    def append_history(self, entry: str) -> None:
        """Save history entry via kioku (preferred) or append to HISTORY.md (fallback)."""
        if self.kioku:
            try:
                self.kioku.save_memory(entry)
                return
            except Exception as e:
                logger.warning("Kioku save failed, falling back to file: {}", e)
        with open(self.history_file, "a", encoding="utf-8") as f:
            f.write(entry.rstrip() + "\n\n")

    def get_memory_context(self) -> str:
        long_term = self.read_long_term()
        return f"## Long-term Memory\n{long_term}" if long_term else ""

    def search(self, query: str, limit: int = 10, entities: list[str] | None = None) -> dict | None:
        """Search memories via kioku. Returns None if unavailable."""
        if not self.kioku:
            return None
        try:
            return self.kioku.search_memories(query, limit=limit, entities=entities)
        except Exception as e:
            logger.warning("Kioku search failed: {}", e)
            return None

    def recall_entity(self, entity: str, max_hops: int = 2, limit: int = 10) -> dict | None:
        """Recall entity via kioku graph. Returns None if unavailable."""
        if not self.kioku:
            return None
        try:
            return self.kioku.recall_entity(entity, max_hops=max_hops, limit=limit)
        except Exception as e:
            logger.warning("Kioku recall failed: {}", e)
            return None

    def kg_index(self, content_hash: str, entities: list, relationships: list) -> dict | None:
        """Index entities/relationships in kioku KG. Returns None if unavailable."""
        if not self.kioku:
            return None
        try:
            from kioku_lite.service import EntityInput, RelationshipInput
            ents = [EntityInput(**e) if isinstance(e, dict) else e for e in entities]
            rels = [RelationshipInput(**r) if isinstance(r, dict) else r for r in relationships]
            return self.kioku.kg_index(content_hash, ents, rels)
        except Exception as e:
            logger.warning("Kioku kg_index failed: {}", e)
            return None

    def close(self) -> None:
        """Close kioku backend (SQLite cleanup)."""
        if self.kioku:
            try:
                self.kioku.close()
            except Exception:
                pass

    async def consolidate(
        self,
        session: Session,
        provider: LLMProvider,
        model: str,
        *,
        archive_all: bool = False,
        memory_window: int = 50,
    ) -> bool:
        """Consolidate old messages into memory. Delegates to memory_consolidation module."""
        from microbot.agent.memory_consolidation import consolidate_memory
        return await consolidate_memory(
            self, session, provider, model,
            archive_all=archive_all, memory_window=memory_window,
        )
