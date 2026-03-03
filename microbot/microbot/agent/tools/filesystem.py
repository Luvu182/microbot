"""File system tools: read, write, edit, list directory."""

import difflib
import re
from pathlib import Path
from typing import Any

from microbot.agent.tools.base import Tool


def _resolve_path(
    path: str, workspace: Path | None = None, allowed_dir: Path | None = None
) -> Path:
    """Resolve path against workspace (if relative) and enforce directory restriction."""
    p = Path(path).expanduser()
    if not p.is_absolute() and workspace:
        p = workspace / p
    resolved = p.resolve()
    if allowed_dir:
        try:
            resolved.relative_to(allowed_dir.resolve())
        except ValueError:
            raise PermissionError(f"Path {path} is outside allowed directory {allowed_dir}")
    return resolved


class ReadFileTool(Tool):
    """Tool to read file contents with line numbers for reference."""

    def __init__(self, workspace: Path | None = None, allowed_dir: Path | None = None):
        self._workspace = workspace
        self._allowed_dir = allowed_dir

    @property
    def name(self) -> str:
        return "read_file"

    @property
    def description(self) -> str:
        return (
            "Read file contents. Returns numbered lines (e.g. '  1 | text') "
            "so you can reference line numbers in edit_file. "
            "Use offset/limit for large files."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "The file path to read"},
                "offset": {
                    "type": "integer",
                    "description": "Start from this line number (1-based, default 1)",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max lines to return (default: all)",
                },
            },
            "required": ["path"],
        }

    async def execute(self, path: str, offset: int = 1, limit: int = 0, **kwargs: Any) -> str:
        try:
            file_path = _resolve_path(path, self._workspace, self._allowed_dir)
            if not file_path.exists():
                return f"Error: File not found: {path}"
            if not file_path.is_file():
                return f"Error: Not a file: {path}"

            content = file_path.read_text(encoding="utf-8")
            lines = content.splitlines()
            total = len(lines)

            # Apply offset (1-based) and limit
            start = max(0, offset - 1)
            end = start + limit if limit > 0 else total
            selected = lines[start:end]

            # Format with line numbers for easy reference
            width = len(str(min(end, total)))
            numbered = [f"{start + i + 1:>{width}} | {line}" for i, line in enumerate(selected)]
            header = f"[{file_path} — {total} lines total]"
            if start > 0 or end < total:
                header += f" (showing lines {start + 1}-{min(end, total)})"
            return header + "\n" + "\n".join(numbered)
        except PermissionError as e:
            return f"Error: {e}"
        except Exception as e:
            return f"Error reading file: {str(e)}"


class WriteFileTool(Tool):
    """Tool to write content to a file."""

    def __init__(self, workspace: Path | None = None, allowed_dir: Path | None = None):
        self._workspace = workspace
        self._allowed_dir = allowed_dir

    @property
    def name(self) -> str:
        return "write_file"

    @property
    def description(self) -> str:
        return "Write content to a file at the given path. Creates parent directories if needed."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "The file path to write to"},
                "content": {"type": "string", "description": "The content to write"},
            },
            "required": ["path", "content"],
        }

    async def execute(self, path: str, content: str, **kwargs: Any) -> str:
        try:
            file_path = _resolve_path(path, self._workspace, self._allowed_dir)
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content, encoding="utf-8")
            return f"Successfully wrote {len(content)} bytes to {file_path}"
        except PermissionError as e:
            return f"Error: {e}"
        except Exception as e:
            return f"Error writing file: {str(e)}"


class EditFileTool(Tool):
    """Tool to edit a file by text replacement or line-number range.

    Two modes:
    1. **Text mode** (default): provide old_text + new_text for exact replace.
    2. **Line mode**: provide line_start (+ optional line_end) + new_text to
       replace a range of lines. No Unicode text matching needed — much more
       reliable for non-ASCII content (Vietnamese, CJK, etc.).
    """

    def __init__(self, workspace: Path | None = None, allowed_dir: Path | None = None):
        self._workspace = workspace
        self._allowed_dir = allowed_dir

    @property
    def name(self) -> str:
        return "edit_file"

    @property
    def description(self) -> str:
        return (
            "Edit a file. Two modes:\n"
            "1) TEXT mode: provide old_text + new_text (exact match replace).\n"
            "2) LINE mode: provide line_start + new_text to replace lines "
            "(use line numbers from read_file). Much more reliable for "
            "non-ASCII text like Vietnamese.\n"
            "Optionally set regex=true to match old_text as a regex pattern."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "The file path to edit"},
                "old_text": {"type": "string", "description": "Text to find (exact or regex). Not needed in line mode."},
                "new_text": {"type": "string", "description": "Replacement text"},
                "line_start": {
                    "type": "integer",
                    "description": "First line to replace (1-based). Enables line mode.",
                },
                "line_end": {
                    "type": "integer",
                    "description": "Last line to replace (inclusive, default = line_start). Use with line_start.",
                },
                "regex": {
                    "type": "boolean",
                    "description": "Treat old_text as regex pattern (default false).",
                },
            },
            "required": ["path", "new_text"],
        }

    async def execute(
        self,
        path: str,
        new_text: str,
        old_text: str = "",
        line_start: int = 0,
        line_end: int = 0,
        regex: bool = False,
        **kwargs: Any,
    ) -> str:
        try:
            file_path = _resolve_path(path, self._workspace, self._allowed_dir)
            if not file_path.exists():
                return f"Error: File not found: {path}"

            content = file_path.read_text(encoding="utf-8")

            # --- LINE MODE: replace by line range ---
            if line_start > 0:
                return self._line_edit(file_path, content, new_text, line_start, line_end)

            # --- TEXT MODE: exact or regex match replace ---
            if not old_text:
                return "Error: Provide old_text (text mode) or line_start (line mode)."

            if old_text == new_text:
                return "Error: old_text and new_text are identical — nothing to change."

            if regex:
                return self._regex_edit(file_path, content, old_text, new_text)

            return self._text_edit(file_path, content, old_text, new_text)
        except PermissionError as e:
            return f"Error: {e}"
        except Exception as e:
            return f"Error editing file: {str(e)}"

    @staticmethod
    def _line_edit(file_path: Path, content: str, new_text: str, start: int, end: int) -> str:
        """Replace lines [start, end] (1-based inclusive) with new_text."""
        lines = content.splitlines(keepends=True)
        total = len(lines)
        if end <= 0:
            end = start
        if start < 1 or start > total:
            return f"Error: line_start={start} out of range (file has {total} lines)."
        if end < start or end > total:
            return f"Error: line_end={end} out of range (valid: {start}-{total})."

        # Build replacement: ensure new_text ends with newline to maintain structure
        replacement = new_text if new_text.endswith("\n") else new_text + "\n"
        before = lines[: start - 1]
        after = lines[end:]
        new_content = "".join(before) + replacement + "".join(after)

        # Preserve original EOF style (no trailing newline if original didn't have one)
        if not content.endswith("\n") and new_content.endswith("\n"):
            new_content = new_content[:-1]

        if new_content == content:
            return "Error: Line replacement produced identical content — no changes written."

        file_path.write_text(new_content, encoding="utf-8")
        replaced_count = end - start + 1
        new_count = len(new_text.splitlines())
        return f"Successfully edited {file_path} (replaced lines {start}-{end} [{replaced_count} lines] with {new_count} new lines)"

    @staticmethod
    def _regex_edit(file_path: Path, content: str, pattern: str, replacement: str) -> str:
        """Replace first regex match."""
        try:
            new_content, count = re.subn(pattern, replacement, content, count=1)
        except re.error as e:
            return f"Error: Invalid regex pattern: {e}"
        if count == 0:
            return f"Error: Regex pattern not found in {file_path}."
        if new_content == content:
            return "Error: Regex replacement produced identical content — no changes written."
        file_path.write_text(new_content, encoding="utf-8")
        return f"Successfully edited {file_path} (regex replaced 1 match)"

    @staticmethod
    def _text_edit(file_path: Path, content: str, old_text: str, new_text: str) -> str:
        """Exact text match and replace."""
        if old_text not in content:
            return EditFileTool._not_found_message(old_text, content, str(file_path))

        count = content.count(old_text)
        if count > 1:
            return f"Warning: old_text appears {count} times. Provide more context to make it unique."

        new_content = content.replace(old_text, new_text, 1)
        if new_content == content:
            return "Error: Replacement produced identical content — no changes written."

        file_path.write_text(new_content, encoding="utf-8")
        return f"Successfully edited {file_path}"

    @staticmethod
    def _not_found_message(old_text: str, content: str, path: str) -> str:
        """Build a helpful error when old_text is not found, with best-match diff."""
        lines = content.splitlines(keepends=True)
        old_lines = old_text.splitlines(keepends=True)
        window = len(old_lines)

        best_ratio, best_start = 0.0, 0
        for i in range(max(1, len(lines) - window + 1)):
            ratio = difflib.SequenceMatcher(None, old_lines, lines[i : i + window]).ratio()
            if ratio > best_ratio:
                best_ratio, best_start = ratio, i

        if best_ratio > 0.5:
            diff = "\n".join(
                difflib.unified_diff(
                    old_lines,
                    lines[best_start : best_start + window],
                    fromfile="old_text (provided)",
                    tofile=f"{path} (actual, line {best_start + 1})",
                    lineterm="",
                )
            )
            hint = (
                f"\nHint: Use line mode instead — "
                f"edit_file(path, line_start={best_start + 1}, "
                f"line_end={best_start + window}, new_text=...)"
            )
            return (
                f"Error: old_text not found in {path}.\n"
                f"Best match ({best_ratio:.0%} similar) at line {best_start + 1}:\n{diff}{hint}"
            )
        return f"Error: old_text not found in {path}. No similar text found. Use read_file to verify content."


class ListDirTool(Tool):
    """Tool to list directory contents."""

    def __init__(self, workspace: Path | None = None, allowed_dir: Path | None = None):
        self._workspace = workspace
        self._allowed_dir = allowed_dir

    @property
    def name(self) -> str:
        return "list_dir"

    @property
    def description(self) -> str:
        return "List the contents of a directory."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {"path": {"type": "string", "description": "The directory path to list"}},
            "required": ["path"],
        }

    async def execute(self, path: str, **kwargs: Any) -> str:
        try:
            dir_path = _resolve_path(path, self._workspace, self._allowed_dir)
            if not dir_path.exists():
                return f"Error: Directory not found: {path}"
            if not dir_path.is_dir():
                return f"Error: Not a directory: {path}"

            items = []
            for item in sorted(dir_path.iterdir()):
                prefix = "📁 " if item.is_dir() else "📄 "
                items.append(f"{prefix}{item.name}")

            if not items:
                return f"Directory {path} is empty"

            return "\n".join(items)
        except PermissionError as e:
            return f"Error: {e}"
        except Exception as e:
            return f"Error listing directory: {str(e)}"
