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
        except Exception as error:  # noqa: BLE001 - test diagnostic
            last_error = error
        time.sleep(0.25)
    raise AssertionError(f"runtime-api did not become ready: {last_error}")


def assert_error(status: int, payload: dict, expected_status: int, expected_code: str) -> None:
    assert status == expected_status, payload
    assert payload.get("error", {}).get("code") == expected_code, payload
    assert isinstance(payload.get("error", {}).get("message"), str) and payload["error"]["message"], payload


def main() -> None:
    require_tool("pnpm")

    with tempfile.TemporaryDirectory(prefix="bobquest-b5-") as tmpdir:
        tmp = Path(tmpdir)
        port = free_port()
        base_url = f"http://127.0.0.1:{port}"
        fake_bob = ROOT / "scripts" / "fake-bob-shell.mjs"

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
                "BOBSHELL_COMMAND": str(fake_bob),
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

            status, payload = http_json("POST", f"{base_url}/api/runs", {})
            assert_error(status, payload, 400, "INVALID_REQUEST_BODY")

            status, payload = http_json("POST", f"{base_url}/api/runs", {"repo_id": "evil/repo"})
            assert_error(status, payload, 403, "REPO_NOT_ALLOWED")

            status, payload = http_json("POST", f"{base_url}/api/runs", {"repo_url": "file:///tmp/repo"})
            assert_error(status, payload, 400, "INVALID_REPO")

            status, payload = http_json("GET", f"{base_url}/api/runs/run_missing123")
            assert_error(status, payload, 404, "RUN_NOT_FOUND")

            status, payload = http_json("POST", f"{base_url}/api/runs/run_missing123/objectives/objective/evaluate", {})
            assert_error(status, payload, 400, "INVALID_REQUEST_BODY")

            status, payload = http_json("POST", f"{base_url}/api/runs/run_missing123/localize", {"language": "es"})
            assert_error(status, payload, 503, "FEATURE_UNAVAILABLE")
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
            if process.returncode not in (0, -signal.SIGTERM if hasattr(signal, "SIGTERM") else -15, 143, None):
                sys.stderr.write("\n".join(output_lines[-80:]))


if __name__ == "__main__":
    main()
