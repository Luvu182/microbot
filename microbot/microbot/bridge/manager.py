"""Bridge process manager — spawns and monitors Node.js bridge subprocesses."""

import asyncio
import os
from dataclasses import dataclass, field
from pathlib import Path

from loguru import logger


@dataclass
class BridgeDef:
    """Static bridge definition."""

    source_subdir: str  # relative to project root, e.g. "bridge/zalo"
    default_port: int
    extra_env: dict[str, str] = field(default_factory=dict)


BRIDGE_REGISTRY: dict[str, BridgeDef] = {
    "whatsapp": BridgeDef(
        source_subdir="bridge",
        default_port=3001,
        extra_env={"AUTH_DIR": str(Path.home() / ".microbot" / "whatsapp-auth")},
    ),
    "zalo": BridgeDef(
        source_subdir="bridge/zalo",
        default_port=3002,
        extra_env={"CREDS_PATH": str(Path.home() / ".microbot" / "zalo-creds.json")},
    ),
}


class BridgeManager:
    """Spawn and monitor Node.js bridge subprocesses."""

    def __init__(self) -> None:
        self._procs: dict[str, asyncio.subprocess.Process] = {}
        self._tasks: dict[str, asyncio.Task] = {}

    async def ensure_running(self, name: str, port: int, token: str = "") -> None:
        """Ensure bridge is installed, built, and running.

        Auto-install/build flow:
        1. dist/index.js exists → start immediately
        2. node_modules/ exists but no dist → npm run build → start
        3. Nothing installed → npm install && npm run build → start
        """
        if name in self._procs or name in self._tasks:
            return
        defn = BRIDGE_REGISTRY.get(name)
        if not defn:
            logger.warning("No bridge definition for {}", name)
            return

        bridge_dir = await _ensure_bridge_built(name, defn.source_subdir)
        if bridge_dir is None:
            return
        entry = bridge_dir / "dist" / "index.js"
        if not entry.exists():
            logger.error("Bridge entry not found after build: {}", entry)
            return

        env = {**os.environ, "BRIDGE_PORT": str(port), **defn.extra_env}
        if token:
            env["BRIDGE_TOKEN"] = token

        self._tasks[name] = asyncio.create_task(
            self._run_and_monitor(name, str(entry), env)
        )
        logger.info("{} bridge queued for start on port {}", name, port)

    async def _run_and_monitor(self, name: str, entry: str, env: dict) -> None:
        """Run bridge process with auto-restart on crash (max 5 retries)."""
        retries = 0
        max_retries = 5
        while retries < max_retries:
            logger.info("Starting {} bridge (attempt {})...", name, retries + 1)
            proc = await asyncio.create_subprocess_exec(
                "node", entry,
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            self._procs[name] = proc
            # Stream stdout/stderr to logger — track tasks to cancel on shutdown
            pipe_tasks = [
                asyncio.create_task(self._pipe_output(name, proc.stdout, "info")),
                asyncio.create_task(self._pipe_output(name, proc.stderr, "warning")),
            ]

            code = await proc.wait()
            for t in pipe_tasks:
                t.cancel()
            self._procs.pop(name, None)
            if code == 0:
                logger.info("{} bridge exited cleanly", name)
                break
            retries += 1
            delay = min(2 ** retries, 30)
            logger.warning("{} bridge exited (code {}), restarting in {}s", name, code, delay)
            await asyncio.sleep(delay)

    @staticmethod
    async def _pipe_output(
        name: str,
        stream: asyncio.StreamReader | None,
        level: str,
    ) -> None:
        """Pipe subprocess output lines to loguru."""
        if stream is None:
            return
        log_fn = getattr(logger, level, logger.info)
        while True:
            line = await stream.readline()
            if not line:
                break
            log_fn("[bridge:{}] {}", name, line.decode(errors="replace").rstrip())

    async def stop_all(self) -> None:
        """Gracefully stop all bridge processes."""
        for name, proc in list(self._procs.items()):
            proc.terminate()
            try:
                await asyncio.wait_for(proc.wait(), timeout=5)
            except asyncio.TimeoutError:
                proc.kill()
            logger.info("Stopped {} bridge", name)
        tasks_to_cancel = list(self._tasks.values())
        for task in tasks_to_cancel:
            task.cancel()
        if tasks_to_cancel:
            await asyncio.gather(*tasks_to_cancel, return_exceptions=True)
        self._procs.clear()
        self._tasks.clear()


async def _ensure_bridge_built(name: str, source_subdir: str) -> Path | None:
    """Ensure bridge is npm-installed and built. Returns bridge dir or None on failure.

    Smart caching:
    - dist/index.js exists → return immediately (0s)
    - node_modules/ exists but no dist → npm run build (~3s)
    - Nothing → npm install + npm run build (~30s first time)
    """
    # Project root = two levels up from this file (microbot/bridge/manager.py -> microbot/)
    project_root = Path(__file__).resolve().parents[2]
    bridge_dir = project_root / source_subdir

    if not bridge_dir.exists():
        logger.error("Bridge source not found: {}", bridge_dir)
        return None

    entry = bridge_dir / "dist" / "index.js"
    if entry.exists():
        return bridge_dir  # Already built

    node_modules = bridge_dir / "node_modules"
    if not node_modules.exists():
        logger.info("Installing {} bridge dependencies (first time)...", name)
        proc = await asyncio.create_subprocess_exec(
            "npm", "install", cwd=str(bridge_dir),
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            logger.error("npm install failed for {}: {}", name, stderr.decode()[:500])
            return None

    logger.info("Building {} bridge...", name)
    proc = await asyncio.create_subprocess_exec(
        "npm", "run", "build", cwd=str(bridge_dir),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        logger.error("npm build failed for {}: {}", name, stderr.decode()[:500])
        return None

    return bridge_dir
