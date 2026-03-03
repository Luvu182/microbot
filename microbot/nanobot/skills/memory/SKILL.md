---
name: memory
description: Persistent memory with hybrid search and knowledge graph.
always: true
---

# Memory

## Structure

- `memory/MEMORY.md` — Curated long-term facts (preferences, project context, relationships). Always loaded into your context.
- `memory/data/kioku.db` — Searchable memory database with BM25 + vector + knowledge graph.
- `memory/entries/*.md` — Daily memory logs (auto-generated, human-readable).
- `memory/HISTORY.md` — Legacy log (deprecated, kept for backward compat).

## Searching Past Events

Use the `search_memory` tool for hybrid retrieval:

```
search_memory(query="deployment strategy discussion", limit=5)
search_memory(query="Alice's preferences", entities=["Alice"])
```

Returns ranked results with content, date, score, and graph context.

## Recalling Entities

Use the `recall_entity` tool to explore the knowledge graph:

```
recall_entity(entity="Project Alpha", max_hops=2)
```

Returns connected entities, relationships, and source memories.

## When to Update MEMORY.md

Write important facts immediately using `edit_file` or `write_file`:
- User preferences ("I prefer dark mode")
- Project context ("The API uses OAuth2")
- Relationships ("Alice is the project lead")

## Auto-consolidation

Old conversations are automatically summarized and stored in the memory database. Key entities and relationships are extracted to the knowledge graph. Long-term facts are updated in MEMORY.md. You don't need to manage this.

## Fallback

If search tools are unavailable, use grep on HISTORY.md:
```bash
grep -i "keyword" memory/HISTORY.md
```
