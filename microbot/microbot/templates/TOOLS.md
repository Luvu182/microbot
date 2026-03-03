# Tool Usage Notes

Tool signatures are provided automatically via function calling.
This file documents non-obvious constraints and usage patterns.

## edit_file — Editing Files

Two modes available:
1. **Text mode**: `edit_file(path, old_text, new_text)` — exact string match
2. **Line mode**: `edit_file(path, line_start=N, line_end=M, new_text=...)` — replace by line numbers

**IMPORTANT: For non-ASCII text (Vietnamese, CJK, etc.), always prefer line mode.**
Text mode requires exact Unicode character matching which is error-prone.
Use `read_file` first to see line numbers, then use `line_start`/`line_end`.

**Do NOT use exec+python or sed to edit files** — use edit_file line mode instead.

## exec — Safety Limits

- Commands have a configurable timeout (default 60s)
- Dangerous commands are blocked (rm -rf, format, dd, shutdown, etc.)
- Output is truncated at 10,000 characters
- `restrictToWorkspace` config can limit file access to the workspace
- Do NOT use exec for file editing — use edit_file instead

## cron — Scheduled Reminders

- Please refer to cron skill for usage.
