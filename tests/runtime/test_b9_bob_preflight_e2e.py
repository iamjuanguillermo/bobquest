#!/usr/bin/env python3
"""
Backend B9 — Bob Shell Real Preflight — E2E Tests

Tests preflight behavior with fake Bob Shell in various scenarios.
Does not use real IBM Bob Shell or spend Bobcoins.
"""
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
        with urllib.request.urlopen(request, timeout=10) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        payload = error.read().decode("utf-8")
        return error.code, json.loads(payload or "{}")


def wait_for_server(base_url: str, process: subprocess.Popen[str]) -> None:
    deadline = time.time() + 30
    last_error: Exception | None = None
    while time.time() < deadline:
        if process.poll() is not None:
            output = ""
            if process.stdout is not None:
                try:
                    output = process.stdout.read()
                except Exception:  # noqa: BLE001 - best-effort diagnostics
                    output = ""
            raise AssertionError(f"runtime-api exited early with code {process.returncode}\n{output}")
        try:
            status, payload = http_json("GET", f"{base_url}/api/healthz")
            if status == 200 and payload.get("ok") is True:
                return
        except Exception as error:  # noqa: BLE001
            last_error = error
        time.sleep(0.25)
    raise AssertionError(f"runtime-api did not become ready: {last_error}")


def stop_server(process: subprocess.Popen[str]) -> None:
    if process.poll() is None:
        if hasattr(os, "killpg"):
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
        else:
            process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        if hasattr(os, "killpg"):
            os.killpg(os.getpgid(process.pid), signal.SIGKILL)
        else:
            process.kill()
        process.wait(timeout=5)


def base_env(tmp: Path, port: int) -> dict[str, str]:
    return {
        **os.environ,
        "PORT": str(port),
        "HOST": "127.0.0.1",
        "BOBQUEST_PROJECT_ROOT": str(ROOT),
        "BOBQUEST_RUNTIME_DATA_DIR": str(tmp / f"runtime-{port}" / "runs"),
        "BOBQUEST_WORKSPACE_DIR": str(tmp / f"runtime-{port}" / "workspaces"),
        "BOBQUEST_OPTIONAL_LLM_ENABLED": "false",
        "BOBQUEST_RUNTIME_DISABLED": "false",
    }


def start_server(env: dict[str, str]) -> subprocess.Popen[str]:
    return subprocess.Popen(
        ["pnpm", "--filter", "bobquest-runtime-api", "start"],
        cwd=ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        preexec_fn=os.setsid if hasattr(os, "setsid") else None,
    )


def create_fake_bob_status_script(
    path: Path,
    *,
    exit_code: int = 0,
    stdout: str = "",
    stderr: str = "",
    sleep_ms: int = 0,
    counter_path: Path | None = None,
) -> None:
    counter_expr = ""
    if counter_path is not None:
        counter_expr = f"""
const counterPath = {json.dumps(str(counter_path))};
let counter = 0;
try {{ counter = Number(fs.readFileSync(counterPath, 'utf8') || '0'); }} catch {{ counter = 0; }}
counter += 1;
fs.writeFileSync(counterPath, String(counter));
"""
    script = f"""#!/usr/bin/env node
import fs from 'node:fs';
const exitCode = {exit_code};
const stdout = {json.dumps(stdout)};
const stderr = {json.dumps(stderr)};
const sleepMs = {sleep_ms};
{counter_expr}
if (sleepMs > 0) {{
  await new Promise((resolve) => setTimeout(resolve, sleepMs));
}}
if (stderr) process.stderr.write(stderr);
if (stdout) process.stdout.write(stdout);
process.exit(exitCode);
"""
    path.write_text(script, encoding="utf-8")
    path.chmod(0o755)


def test_not_configured(tmp: Path, port: int) -> None:
    print("  Testing not_configured scenario...")
    env = base_env(tmp, port)
    env.update({"BOBSHELL_COMMAND": ""})
    process = start_server(env)
    try:
        base_url = f"http://127.0.0.1:{port}"
        wait_for_server(base_url, process)
        status_code, status_data = http_json("GET", f"{base_url}/api/bob/status")
        assert status_code == 200, status_data
        assert status_data["available"] is False
        assert status_data["status"] == "not_configured"
        assert "not configured" in status_data["message"].lower()

        cap_code, cap_data = http_json("GET", f"{base_url}/api/capabilities")
        assert cap_code == 200, cap_data
        assert cap_data["bob_shell_runtime"]["available"] is False
        assert cap_data["bob_shell_runtime"]["status"] == "not_configured"
        print("    ✓ not_configured status works correctly")
    finally:
        stop_server(process)


def test_binary_not_found(tmp: Path, port: int) -> None:
    print("  Testing binary_not_found scenario...")
    env = base_env(tmp, port)
    env.update({"BOBSHELL_COMMAND": "/nonexistent/bob-shell"})
    process = start_server(env)
    try:
        base_url = f"http://127.0.0.1:{port}"
        wait_for_server(base_url, process)
        status_code, status_data = http_json("GET", f"{base_url}/api/bob/status")
        assert status_code == 200, status_data
        assert status_data["available"] is False
        assert status_data["status"] == "binary_not_found"
        print("    ✓ binary_not_found status works correctly")
    finally:
        stop_server(process)


def test_preflight_failed(tmp: Path, port: int) -> None:
    print("  Testing preflight_failed scenario...")
    fake_bob = tmp / f"fake-bob-fail-{port}.mjs"
    create_fake_bob_status_script(fake_bob, exit_code=1, stderr="Command failed")
    env = base_env(tmp, port)
    env.update({"BOBSHELL_COMMAND": str(fake_bob), "BOBSHELL_STATUS_ARGS": "--version"})
    process = start_server(env)
    try:
        base_url = f"http://127.0.0.1:{port}"
        wait_for_server(base_url, process)
        status_code, status_data = http_json("GET", f"{base_url}/api/bob/status")
        assert status_code == 200, status_data
        assert status_data["available"] is False
        assert status_data["status"] == "preflight_failed"
        assert "preflight_duration_ms" in status_data
        assert "Command failed" not in json.dumps(status_data), status_data
        print("    ✓ preflight_failed status works correctly")
    finally:
        stop_server(process)


def test_auth_invalid(tmp: Path, port: int) -> None:
    print("  Testing auth_invalid scenario...")
    fake_bob = tmp / f"fake-bob-auth-{port}.mjs"
    create_fake_bob_status_script(fake_bob, exit_code=1, stderr="Error: authentication failed. Invalid credentials.")
    env = base_env(tmp, port)
    env.update({"BOBSHELL_COMMAND": str(fake_bob), "BOBSHELL_STATUS_ARGS": "--version"})
    process = start_server(env)
    try:
        base_url = f"http://127.0.0.1:{port}"
        wait_for_server(base_url, process)
        status_code, status_data = http_json("GET", f"{base_url}/api/bob/status")
        assert status_code == 200, status_data
        assert status_data["available"] is False
        assert status_data["status"] == "auth_invalid"
        assert "Invalid credentials" not in json.dumps(status_data), status_data
        print("    ✓ auth_invalid status detected correctly")
    finally:
        stop_server(process)


def test_ready_with_version(tmp: Path, port: int) -> None:
    print("  Testing ready scenario with version detection...")
    fake_bob = tmp / f"fake-bob-ready-{port}.mjs"
    create_fake_bob_status_script(fake_bob, exit_code=0, stdout="IBM Bob Shell version: 1.2.3\n")
    env = base_env(tmp, port)
    env.update({"BOBSHELL_COMMAND": str(fake_bob), "BOBSHELL_STATUS_ARGS": "--version"})
    process = start_server(env)
    try:
        base_url = f"http://127.0.0.1:{port}"
        wait_for_server(base_url, process)
        status_code, status_data = http_json("GET", f"{base_url}/api/bob/status")
        assert status_code == 200, status_data
        assert status_data["available"] is True
        assert status_data["status"] == "ready"
        assert status_data.get("version") == "1.2.3"
        assert "command_path" in status_data
        assert "last_check_at" in status_data

        cap_code, cap_data = http_json("GET", f"{base_url}/api/capabilities")
        assert cap_code == 200, cap_data
        assert cap_data["bob_shell_runtime"]["available"] is True
        assert cap_data["bob_shell_runtime"]["status"] == "ready"
        assert cap_data["bob_shell_runtime"]["version"] == "1.2.3"
        print("    ✓ ready status with version detection works correctly")
    finally:
        stop_server(process)


def test_timeout(tmp: Path, port: int) -> None:
    print("  Testing preflight timeout scenario...")
    fake_bob = tmp / f"fake-bob-timeout-{port}.mjs"
    create_fake_bob_status_script(fake_bob, exit_code=0, stdout="v9.9.9", sleep_ms=500)
    env = base_env(tmp, port)
    env.update({"BOBSHELL_COMMAND": str(fake_bob), "BOBSHELL_STATUS_TIMEOUT_MS": "50"})
    process = start_server(env)
    try:
        base_url = f"http://127.0.0.1:{port}"
        wait_for_server(base_url, process)
        status_code, status_data = http_json("GET", f"{base_url}/api/bob/status")
        assert status_code == 200, status_data
        assert status_data["available"] is False
        assert status_data["status"] == "preflight_failed"
        assert "timed out" in status_data["message"].lower(), status_data
        print("    ✓ timeout status works correctly")
    finally:
        stop_server(process)


def test_disabled(tmp: Path, port: int) -> None:
    print("  Testing disabled scenario...")
    env = base_env(tmp, port)
    env.update({"BOBSHELL_COMMAND": "bob", "BOBQUEST_RUNTIME_DISABLED": "true"})
    process = start_server(env)
    try:
        base_url = f"http://127.0.0.1:{port}"
        wait_for_server(base_url, process)
        status_code, status_data = http_json("GET", f"{base_url}/api/bob/status")
        assert status_code == 200, status_data
        assert status_data["available"] is False
        assert status_data["status"] == "disabled"
        print("    ✓ disabled status works correctly")
    finally:
        stop_server(process)


def test_force_check_and_cache(tmp: Path, port: int) -> None:
    print("  Testing cache and force_check parameter...")
    fake_bob = tmp / f"fake-bob-force-{port}.mjs"
    counter = tmp / f"status-counter-{port}.txt"
    create_fake_bob_status_script(fake_bob, exit_code=0, stdout="v1.0.0", counter_path=counter)
    env = base_env(tmp, port)
    env.update({
        "BOBSHELL_COMMAND": str(fake_bob),
        "BOBSHELL_PREFLIGHT_CACHE_TTL_MS": "60000",
    })
    process = start_server(env)
    try:
        base_url = f"http://127.0.0.1:{port}"
        wait_for_server(base_url, process)
        _, data1 = http_json("GET", f"{base_url}/api/bob/status")
        timestamp1 = data1.get("last_check_at")
        count1 = counter.read_text(encoding="utf-8")

        _, data2 = http_json("GET", f"{base_url}/api/bob/status")
        timestamp2 = data2.get("last_check_at")
        count2 = counter.read_text(encoding="utf-8")
        assert timestamp1 == timestamp2, "Cache should preserve last_check_at"
        assert count1 == count2, "Cache should avoid a second preflight execution"

        time.sleep(0.02)
        _, data3 = http_json("GET", f"{base_url}/api/bob/status?force_check=true")
        timestamp3 = data3.get("last_check_at")
        count3 = counter.read_text(encoding="utf-8")
        assert timestamp3 != timestamp1, "force_check should bypass cache"
        assert int(count3) == int(count1) + 1, "force_check should execute preflight again"
        print("    ✓ cache and force_check work correctly")
    finally:
        stop_server(process)


def test_post_runs_rejects_when_not_ready(tmp: Path, port: int) -> None:
    print("  Testing POST /api/runs rejection when not ready...")
    env = base_env(tmp, port)
    env.update({
        "BOBSHELL_COMMAND": "",
        "BOBQUEST_PUBLIC_DEMO_MODE": "true",
        "BOBQUEST_ALLOWED_REPOS": "test/repo",
    })
    process = start_server(env)
    try:
        base_url = f"http://127.0.0.1:{port}"
        wait_for_server(base_url, process)
        status_code, error_data = http_json("POST", f"{base_url}/api/runs", {"repo_id": "test/repo"})
        assert status_code == 503, error_data
        assert "error" in error_data
        assert error_data["error"]["code"] == "BOB_UNAVAILABLE"
        assert "not ready" in error_data["error"]["message"].lower()
        print("    ✓ POST /api/runs correctly rejects when Bob Shell not ready")
    finally:
        stop_server(process)


def main() -> None:
    require_tool("node")
    require_tool("pnpm")
    print("Backend B9 — Bob Shell Preflight E2E Tests\n")
    with tempfile.TemporaryDirectory(prefix="bobquest-b9-") as tmpdir:
        tmp = Path(tmpdir)
        tests = [
            test_not_configured,
            test_binary_not_found,
            test_preflight_failed,
            test_auth_invalid,
            test_ready_with_version,
            test_timeout,
            test_disabled,
            test_force_check_and_cache,
            test_post_runs_rejects_when_not_ready,
        ]
        passed = 0
        failed = 0
        for test in tests:
            port = free_port()
            try:
                test(tmp, port)
                passed += 1
            except AssertionError as error:
                print(f"  ✗ {test.__name__}: {error}")
                failed += 1
            except Exception as error:
                print(f"  ✗ {test.__name__}: unexpected error: {error}")
                failed += 1
        print(f"\n{passed} passed, {failed} failed")
        sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()

# Made with Bob
