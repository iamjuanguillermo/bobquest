#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SERVICE = ROOT / "apps" / "runtime-api" / "src" / "services" / "EvaluationService.ts"
SERVER = ROOT / "apps" / "runtime-api" / "src" / "server.ts"
FAKE_BOB = ROOT / "scripts" / "fake-bob-shell.mjs"


def main() -> None:
    service = SERVICE.read_text(encoding="utf-8")
    server = SERVER.read_text(encoding="utf-8")
    fake = FAKE_BOB.read_text(encoding="utf-8")

    assert "resolveEvaluationWorkspace" in service, "open evaluation must resolve workspace from persisted run_state"
    assert "state.workspace" in service, "evaluation must use run_state.workspace metadata"
    assert "workspace.status !== 'cloned'" in service, "evaluation must require cloned workspace"
    assert "workspace.repo_dir" in service, "evaluation must use persisted repo_dir"
    assert "workspace_dir: workspaceDir" in service, "Bob Shell evaluation must run in cloned repo workspace"
    assert "Repository workspace:" in service, "evaluation prompt must include repository workspace path"
    assert "purpose: 'evaluate_answer'" in service, "evaluation must call Bob Shell with evaluate purpose"
    assert "this.processRegistry.register(runId, 'evaluate_answer', child)" in service, "evaluation Bob process must be registered for cancellation"
    assert "process.cwd()" not in service, "open evaluation must not use process.cwd() as repository workspace"
    assert "new EvaluationService(env, bobShell, stateStore, projectRoot, processRegistry" in server, "EvaluationService must share BobProcessRegistry with RunService"
    assert "BOBQUEST_FAKE_BOB_EXPECT_EVALUATE_CWD_FILE" in fake, "fake Bob Shell must verify evaluation cwd in E2E tests"


if __name__ == "__main__":
    main()
