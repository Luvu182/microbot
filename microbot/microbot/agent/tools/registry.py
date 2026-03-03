"""Tool registry for dynamic tool management."""

import hashlib
from collections import deque
from typing import Any

from loguru import logger

from microbot.agent.tools.base import Tool


class ToolRegistry:
    """Registry for agent tools with lightweight guardrails.

    Detects LLM edit loops and nudges toward better tool usage.
    """

    _MAX_REPEAT = 3
    _HISTORY_SIZE = 10

    def __init__(self):
        self._tools: dict[str, Tool] = {}
        self._recent: deque[tuple[str, str]] = deque(maxlen=self._HISTORY_SIZE)

    def register(self, tool: Tool) -> None:
        self._tools[tool.name] = tool

    def unregister(self, name: str) -> None:
        self._tools.pop(name, None)

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def has(self, name: str) -> bool:
        return name in self._tools

    def get_definitions(self) -> list[dict[str, Any]]:
        return [tool.to_schema() for tool in self._tools.values()]

    async def execute(self, name: str, params: dict[str, Any]) -> str:
        _HINT = "\n\n[Analyze the error above and try a different approach.]"

        tool = self._tools.get(name)
        if not tool:
            return f"Error: Tool '{name}' not found. Available: {', '.join(self.tool_names)}"

        try:
            errors = tool.validate_params(params)
            if errors:
                return f"Error: Invalid parameters for tool '{name}': " + "; ".join(errors) + _HINT
            result = await tool.execute(**params)
        except Exception as e:
            logger.error("Tool '{}' raised: {}", name, e)
            return f"Error executing {name}: {str(e)}" + _HINT

        is_error = isinstance(result, str) and (
            result.startswith("Error:") or result.startswith("Warning:")
        )
        if is_error:
            result += _HINT

        # --- Guardrails: detect loops and bad patterns ---
        sig = (name, hashlib.md5(str(sorted(params.items())).encode(), usedforsecurity=False).hexdigest()[:12])
        repeat_count = sum(1 for s in self._recent if s == sig)
        self._recent.append(sig)

        if repeat_count >= self._MAX_REPEAT:
            if name == "edit_file":
                result += (
                    "\n\n[STUCK: edit_file called {n}x with same params. "
                    "Text matching is failing — switch to LINE MODE: "
                    "edit_file(path=..., line_start=N, line_end=M, new_text=...). "
                    "Use read_file first to see line numbers.]"
                ).format(n=repeat_count + 1)
            else:
                result += f"\n\n[STUCK: {name} called {repeat_count + 1}x with same params. Try a different approach.]"

        if name == "exec" and "python" in params.get("command", "").lower():
            cmd = params.get("command", "")
            if ".replace(" in cmd and ("open(" in cmd or "write" in cmd):
                result += (
                    "\n\n[HINT: Use edit_file(line_start=N, new_text=...) "
                    "instead of exec+python for file edits — more reliable for non-ASCII text.]"
                )

        return result

    @property
    def tool_names(self) -> list[str]:
        return list(self._tools.keys())

    def __len__(self) -> int:
        return len(self._tools)

    def __contains__(self, name: str) -> bool:
        return name in self._tools
