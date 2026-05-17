#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def require_tool(name: str) -> None:
    if shutil.which(name) is None:
        raise AssertionError(f"required tool not found on PATH: {name}")


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def http_json(method: str, url: str, body: dict | None = None) -> tuple[int, dict]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        payload = error.read().decode("utf-8")
        return error.code, json.loads(payload or "{}")


def wait_for_server(base_url: str, process: subprocess.Popen[str]) -> None:
    deadline = time.time() + 30
    last_error: Exception | None = None
    while time.time() < deadline:
        if process.poll() is not None:
            raise AssertionError(f"runtime-api exited early with code {process.returncode}")
        try:
            status, payload = http_json("GET", f"{base_url}/api/healthz")
            if status == 200 and payload.get("ok") is True:
                return
        except Exception as error:  # noqa: BLE001
            last_error = error
        time.sleep(0.25)
    raise AssertionError(f"runtime-api did not become ready: {last_error}")


def init_local_git_repo(path: Path) -> None:
    path.mkdir(parents=True)
    subprocess.run(["git", "init", "-q"], cwd=path, check=True)
    subprocess.run(["git", "config", "user.email", "bobquest@example.test"], cwd=path, check=True)
    subprocess.run(["git", "config", "user.name", "BobQuest Test"], cwd=path, check=True)
    (path / "README.md").write_text("# BobQuest Demo\n", encoding="utf-8")
    subprocess.run(["git", "add", "README.md"], cwd=path, check=True)
    subprocess.run(["git", "commit", "-q", "-m", "initial"], cwd=path, check=True)


def main() -> None:
    require_tool("git")
    require_tool("pnpm")

    with tempfile.TemporaryDirectory(prefix="bobquest-b8-") as tmpdir:
        tmp = Path(tmpdir)
        origin = tmp / "origin-repo"
        init_local_git_repo(origin)

        gitconfig = tmp / "gitconfig"
        gitconfig.write_text(
            f'[url "file://{origin}"]\n\tinsteadOf = https://github.com/acme/bobquest-demo\n',
            encoding="utf-8",
        )

        port = free_port()
        base_url = f"http://127.0.0.1:{port}"
        env = os.environ.copy()
        env.update(
            {
                "PORT": str(port),
                "HOST": "127.0.0.1",
                "BOBQUEST_PROJECT_ROOT": str(ROOT),
                "BOBQUEST_PUBLIC_DEMO_MODE": "true",
                "BOBQUEST_ALLOWED_REPOS": "acme/bobquest-demo",
                "BOBQUEST_RUNTIME_DATA_DIR": str(tmp / "runtime" / "runs"),
                "BOBQUEST_WORKSPACE_DIR": str(tmp / "runtime" / "workspaces"),
                "BOBQUEST_CLONE_TIMEOUT_MS": "30000",
                "BOBSHELL_COMMAND": str(ROOT / "scripts" / "fake-bob-shell.mjs"),
                "BOBSHELL_TIMEOUT_MS": "30000",
                "BOBQUEST_FAKE_BOB_ANALYSIS_PATH": str(ROOT / "tests" / "fixtures" / "fake_bob_analysis.json"),
                "BOBQUEST_FAKE_BOB_EVALUATION_PATH": str(ROOT / "tests" / "fixtures" / "fake_bob_evaluation.json"),
                "GIT_CONFIG_GLOBAL": str(gitconfig),
                "BOBQUEST_OPTIONAL_LLM_ENABLED": "false",
            }
        )

        process = subprocess.Popen(
            ["pnpm", "--filter", "bobquest-runtime-api", "start"],
            cwd=ROOT,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            preexec_fn=os.setsid if hasattr(os, "setsid") else None,
        )
        output_lines: list[str] = []
        try:
            wait_for_server(base_url, process)
            status, created = http_json("POST", f"{base_url}/api/runs", {"repo_id": "acme/bobquest-demo"})
            assert status == 202, created
            run_id = created["run_id"]

            deadline = time.time() + 30
            state = created
            while time.time() < deadline:
                status, state = http_json("GET", f"{base_url}/api/runs/{run_id}")
                assert status == 200, state
                if state["state"] in {"ready", "failed", "cancelled"}:
                    break
                time.sleep(0.25)

            assert state["state"] == "ready", state
            timings = state["observability"]["phase_timings"]
            by_phase = {timing["phase"]: timing for timing in timings if timing["status"] == "completed"}
            for phase in ["creating_workspace", "cloning_repo", "running_bob_analysis", "parsing_bob_output"]:
                assert phase in by_phase, timings
                assert by_phase[phase]["duration_ms"] is not None, by_phase[phase]
                assert by_phase[phase]["error_code"] is None, by_phase[phase]

            state_file = tmp / "runtime" / "runs" / run_id / "run_state.json"
            persisted = json.loads(state_file.read_text(encoding="utf-8"))
            assert persisted["observability"]["phase_timings"], persisted
        finally:
            if process.poll() is None:
                if hasattr(os, "killpg"):
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                else:
                    process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
            if process.stdout is not None:
                output_lines.extend(process.stdout.read().splitlines())
            combined_logs = "\n".join(output_lines)
            assert "Flow-guided repo health check" not in combined_logs, "raw Bob stdout leaked into backend logs"
            assert "schema_version" not in combined_logs, "raw Bob JSON leaked into backend logs"
            if process.returncode not in (0, -signal.SIGTERM if hasattr(signal, "SIGTERM") else -15, 143, None):
                sys.stderr.write("\n".join(output_lines[-80:]))


if __name__ == "__main__":
    main()
