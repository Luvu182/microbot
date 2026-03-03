"""Tests for kioku-lite memory integration."""

import json

import pytest

from nanobot.agent.memory import KIOKU_AVAILABLE, MemoryStore


@pytest.fixture
def workspace(tmp_path):
    """Create a temp workspace."""
    return tmp_path


@pytest.fixture
def memory_store_with_kioku(workspace):
    """MemoryStore with kioku backend (fake embedder for speed)."""
    if not KIOKU_AVAILABLE:
        pytest.skip("kioku-lite not installed")
    return MemoryStore(workspace, kioku_config={
        "enabled": True,
        "embed_provider": "fake",
        "embed_dim": 384,
    })


@pytest.fixture
def memory_store_fallback(workspace):
    """MemoryStore without kioku (file-based fallback)."""
    return MemoryStore(workspace, kioku_config={"enabled": False})


class TestMemoryStoreKioku:
    """Tests with kioku backend."""

    def test_init_creates_dirs(self, memory_store_with_kioku, workspace):
        assert memory_store_with_kioku.kioku is not None
        assert (workspace / "memory").is_dir()

    def test_append_history_saves_to_kioku(self, memory_store_with_kioku):
        memory_store_with_kioku.append_history("[2026-03-03] Test entry")
        result = memory_store_with_kioku.search("Test entry", limit=1)
        assert result is not None
        assert result["count"] >= 1

    def test_search_returns_results(self, memory_store_with_kioku):
        memory_store_with_kioku.append_history("Alice prefers dark mode")
        result = memory_store_with_kioku.search("dark mode")
        assert result is not None
        assert result["count"] >= 1

    def test_memory_md_unchanged(self, memory_store_with_kioku):
        memory_store_with_kioku.write_long_term("# Facts\n- User likes cats")
        content = memory_store_with_kioku.read_long_term()
        assert "User likes cats" in content

    def test_kg_index(self, memory_store_with_kioku):
        import hashlib
        memory_store_with_kioku.append_history("Alice works on Project Alpha")
        h = hashlib.sha256("Alice works on Project Alpha".encode()).hexdigest()
        result = memory_store_with_kioku.kg_index(
            h,
            [{"name": "Alice", "type": "PERSON"}, {"name": "Project Alpha", "type": "PROJECT"}],
            [{"source": "Alice", "target": "Project Alpha", "rel_type": "WORKS_ON"}],
        )
        assert result is not None
        assert result["entities_added"] == 2

    def test_recall_entity(self, memory_store_with_kioku):
        import hashlib
        memory_store_with_kioku.append_history("Bob manages the backend team")
        h = hashlib.sha256("Bob manages the backend team".encode()).hexdigest()
        memory_store_with_kioku.kg_index(
            h,
            [{"name": "Bob", "type": "PERSON"}, {"name": "backend team", "type": "ORG"}],
            [{"source": "Bob", "target": "backend team", "rel_type": "MANAGES"}],
        )
        result = memory_store_with_kioku.recall_entity("Bob")
        assert result is not None
        assert result["connected_count"] >= 1

    def test_close(self, memory_store_with_kioku):
        memory_store_with_kioku.close()
        assert True  # no exception


class TestMemoryStoreFallback:
    """Tests with file-based fallback."""

    def test_init_no_kioku(self, memory_store_fallback):
        assert memory_store_fallback.kioku is None

    def test_append_history_to_file(self, memory_store_fallback, workspace):
        memory_store_fallback.append_history("[2026-03-03] Fallback entry")
        history = (workspace / "memory" / "HISTORY.md").read_text()
        assert "Fallback entry" in history

    def test_search_returns_none(self, memory_store_fallback):
        result = memory_store_fallback.search("anything")
        assert result is None

    def test_recall_returns_none(self, memory_store_fallback):
        result = memory_store_fallback.recall_entity("anything")
        assert result is None

    def test_memory_md_works(self, memory_store_fallback):
        memory_store_fallback.write_long_term("# Facts")
        assert memory_store_fallback.read_long_term() == "# Facts"


class TestMemoryTools:
    """Tests for search_memory and recall_entity tools."""

    @pytest.fixture
    def search_tool(self, memory_store_with_kioku):
        from nanobot.agent.tools.memory import MemorySearchTool
        return MemorySearchTool(memory_store_with_kioku)

    @pytest.fixture
    def recall_tool(self, memory_store_with_kioku):
        from nanobot.agent.tools.memory import MemoryRecallTool
        return MemoryRecallTool(memory_store_with_kioku)

    @pytest.mark.asyncio
    async def test_search_tool_returns_json(self, search_tool, memory_store_with_kioku):
        memory_store_with_kioku.append_history("Meeting about API design")
        result = await search_tool.execute(query="API design")
        parsed = json.loads(result)
        assert "results" in parsed

    @pytest.mark.asyncio
    async def test_recall_tool_returns_json(self, recall_tool):
        result = await recall_tool.execute(entity="nonexistent")
        parsed = json.loads(result)
        assert "entity" in parsed

    @pytest.mark.asyncio
    async def test_search_tool_unavailable(self, workspace):
        """Search tool with no kioku returns unavailable message."""
        store = MemoryStore(workspace, kioku_config={"enabled": False})
        from nanobot.agent.tools.memory import MemorySearchTool
        tool = MemorySearchTool(store)
        result = await tool.execute(query="test")
        assert "unavailable" in result.lower()
