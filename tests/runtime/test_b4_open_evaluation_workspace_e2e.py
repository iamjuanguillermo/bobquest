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


def init_local_git_repo(path: Path) -> None:
    path.mkdir(parents=True)
    subprocess.run(["git", "init", "-q"], cwd=path, check=True)
    subprocess.run(["git", "config", "user.email", "bobquest@example.test"], cwd=path, check=True)
    subprocess.run(["git", "config", "user.name", "BobQuest Test"], cwd=path, check=True)
    (path / "README.md").write_text("# BobQuest Demo\n\nRun `pnpm test` before changing code.\n", encoding="utf-8")
    (path / "package.json").write_text('{"scripts":{"test":"echo ok"}}\n', encoding="utf-8")
    (path / "WORKSPACE_ONLY_MARKER.txt").write_text("evaluation cwd must be cloned repo\n", encoding="utf-8")
    subprocess.run(["git", "add", "README.md", "package.json", "WORKSPACE_ONLY_MARKER.txt"], cwd=path, check=True)
    subprocess.run(["git", "commit", "-q", "-m", "initial"], cwd=path, check=True)


def main() -> None:
    require_tool("git")
    require_tool("pnpm")

    with tempfile.TemporaryDirectory(prefix="bobquest-b4-") as tmpdir:
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
        fake_bob = ROOT / "scripts" / "fake-bob-shell.mjs"
        analysis = ROOT / "tests" / "fixtures" / "fake_bob_analysis.json"
        evaluation = ROOT / "tests" / "fixtures" / "fake_bob_evaluation.json"
        runtime_dir = tmp / "runtime" / "runs"
        workspace_dir = tmp / "runtime" / "workspaces"

        env = os.environ.copy()
        env.update(
            {
                "PORT": str(port),
                "HOST": "127.0.0.1",
                "BOBQUEST_PROJECT_ROOT": str(ROOT),
                "BOBQUEST_PUBLIC_DEMO_MODE": "true",
                "BOBQUEST_ALLOWED_REPOS": "acme/bobquest-demo",
                "BOBQUEST_RUNTIME_DATA_DIR": str(runtime_dir),
                "BOBQUEST_WORKSPACE_DIR": str(workspace_dir),
                "BOBQUEST_WORKSPACE_TTL_MS": "21600000",
                "BOBQUEST_CLONE_TIMEOUT_MS": "30000",
                "BOBSHELL_COMMAND": str(fake_bob),
                "BOBSHELL_TIMEOUT_MS": "30000",
                "BOBQUEST_FAKE_BOB_ANALYSIS_PATH": str(analysis),
                "BOBQUEST_FAKE_BOB_EVALUATION_PATH": str(evaluation),
                "BOBQUEST_FAKE_BOB_EXPECT_EVALUATE_CWD_FILE": "WORKSPACE_ONLY_MARKER.txt",
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
            workspace = state.get("workspace")
            assert workspace and workspace["status"] == "cloned", state
            assert Path(workspace["repo_dir"]).joinpath("WORKSPACE_ONLY_MARKER.txt").exists(), workspace

            body = {
                "interaction_id": "explain-runtime-path:open_text_evaluated_by_bob",
                "answer": "The run clones the repo, invokes Bob Shell, validates JSON, and stores run_state.",
            }
            status, evaluation_result = http_json(
                "POST",
                f"{base_url}/api/runs/{run_id}/objectives/explain-runtime-path/evaluate",
                body,
            )
            assert status == 200, evaluation_result
            assert evaluation_result["objective_id"] == "explain-runtime-path", evaluation_result
            assert evaluation_result["correct"] is True, evaluation_result

            status, final_state = http_json("GET", f"{base_url}/api/runs/{run_id}")
            assert status == 200, final_state
            assert final_state["state"] == "ready", final_state
            assert final_state["usage"]["evaluations_used"] == 1, final_state
            progress = final_state["objective_progress"]["explain-runtime-path"]
            assert progress["evaluator"] == "bob_shell", progress
            assert progress["status"] == "completed", progress
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
                sys.stderr.write("\n".join(output_lines[-120:]))


if __name__ == "__main__":
    main()
