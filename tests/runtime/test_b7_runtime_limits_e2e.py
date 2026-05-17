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


def http_json(method: str, url: str, body: dict | None = None, timeout: float = 5) -> tuple[int, dict]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
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
        except Exception as error:  # noqa: BLE001 - test diagnostic
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


def start_server(tmp: Path, port: int, gitconfig: Path, sleep_ms: int, max_total: int = 10, max_hour: int = 10) -> subprocess.Popen[str]:
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
            "BOBQUEST_MAX_CONCURRENT_RUNS": "1",
            "BOBQUEST_MAX_RUNS_TOTAL": str(max_total),
            "BOBQUEST_MAX_RUNS_PER_HOUR": str(max_hour),
            "BOBSHELL_COMMAND": str(ROOT / "scripts" / "fake-bob-shell.mjs"),
            "BOBSHELL_TIMEOUT_MS": "30000",
            "BOBQUEST_FAKE_BOB_ANALYSIS_PATH": str(ROOT / "tests" / "fixtures" / "fake_bob_analysis.json"),
            "BOBQUEST_FAKE_BOB_EVALUATION_PATH": str(ROOT / "tests" / "fixtures" / "fake_bob_evaluation.json"),
            "BOBQUEST_FAKE_BOB_SLEEP_MS": str(sleep_ms),
            "GIT_CONFIG_GLOBAL": str(gitconfig),
            "BOBQUEST_OPTIONAL_LLM_ENABLED": "false",
        }
    )
    return subprocess.Popen(
        ["pnpm", "--filter", "bobquest-runtime-api", "start"],
        cwd=ROOT,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        preexec_fn=os.setsid if hasattr(os, "setsid") else None,
    )


def stop_server(process: subprocess.Popen[str]) -> list[str]:
    output_lines: list[str] = []
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
    return output_lines


def wait_for_terminal_state(base_url: str, run_id: str) -> dict:
    deadline = time.time() + 30
    state: dict = {}
    while time.time() < deadline:
        status, state = http_json("GET", f"{base_url}/api/runs/{run_id}")
        assert status == 200, state
        if state.get("state") in {"ready", "failed", "cancelled"}:
            return state
        time.sleep(0.25)
    raise AssertionError(f"run did not complete: {state}")


def assert_run_limit(payload: dict) -> None:
    assert payload.get("error", {}).get("code") == "RUN_LIMIT_REACHED", payload


def main() -> None:
    require_tool("git")
    require_tool("pnpm")

    with tempfile.TemporaryDirectory(prefix="bobquest-b7-") as tmpdir:
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
        process = start_server(tmp, port, gitconfig, sleep_ms=2500, max_total=2, max_hour=2)
        try:
            wait_for_server(base_url, process)
            status, first = http_json("POST", f"{base_url}/api/runs", {"repo_id": "acme/bobquest-demo"})
            assert status == 202, first

            status, blocked = http_json("POST", f"{base_url}/api/runs", {"repo_id": "acme/bobquest-demo"})
            assert status == 429, blocked
            assert_run_limit(blocked)

            terminal = wait_for_terminal_state(base_url, first["run_id"])
            assert terminal["state"] == "ready", terminal

            status, second = http_json("POST", f"{base_url}/api/runs", {"repo_id": "acme/bobquest-demo"})
            assert status == 202, second
            terminal = wait_for_terminal_state(base_url, second["run_id"])
            assert terminal["state"] == "ready", terminal

            status, blocked_total = http_json("POST", f"{base_url}/api/runs", {"repo_id": "acme/bobquest-demo"})
            assert status == 429, blocked_total
            assert_run_limit(blocked_total)
        finally:
            output = stop_server(process)
            if process.returncode not in (0, -signal.SIGTERM if hasattr(signal, "SIGTERM") else -15, 143, None):
                sys.stderr.write("\n".join(output[-80:]))

        limits_file = tmp / "runtime" / "runs" / "_runtime_limits.json"
        limits = json.loads(limits_file.read_text(encoding="utf-8"))
        assert limits["total_runs"] == 2, limits
        assert len(limits["run_timestamps"]) == 2, limits
        assert limits["active_runs"] == {}, limits

        # Restart with the same runtime data directory. Total/hourly limits must persist,
        # while stale active-run slots must not permanently block the deployment.
        port2 = free_port()
        base_url2 = f"http://127.0.0.1:{port2}"
        process2 = start_server(tmp, port2, gitconfig, sleep_ms=0, max_total=2, max_hour=2)
        try:
            wait_for_server(base_url2, process2)
            restarted_limits = json.loads(limits_file.read_text(encoding="utf-8"))
            assert restarted_limits["active_runs"] == {}, restarted_limits
            assert restarted_limits["total_runs"] == 2, restarted_limits
            status, blocked_after_restart = http_json("POST", f"{base_url2}/api/runs", {"repo_id": "acme/bobquest-demo"})
            assert status == 429, blocked_after_restart
            assert_run_limit(blocked_after_restart)
        finally:
            output = stop_server(process2)
            if process2.returncode not in (0, -signal.SIGTERM if hasattr(signal, "SIGTERM") else -15, 143, None):
                sys.stderr.write("\n".join(output[-80:]))


if __name__ == "__main__":
    main()
