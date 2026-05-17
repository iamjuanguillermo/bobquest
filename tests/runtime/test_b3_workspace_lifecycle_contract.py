#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUN_STATE = ROOT / "packages" / "onboarding-contracts" / "src" / "runState.ts"
WORKSPACE = ROOT / "packages" / "repo-workspace" / "src" / "workspaceLifecycle.ts"
RUN_SERVICE = ROOT / "apps" / "runtime-api" / "src" / "services" / "RunService.ts"
ENV = ROOT / "apps" / "runtime-api" / "src" / "env.ts"
SERVER = ROOT / "apps" / "runtime-api" / "src" / "server.ts"


def main() -> None:
    run_state = RUN_STATE.read_text(encoding="utf-8")
    workspace = WORKSPACE.read_text(encoding="utf-8")
    run_service = RUN_SERVICE.read_text(encoding="utf-8")
    env = ENV.read_text(encoding="utf-8")
    server = SERVER.read_text(encoding="utf-8")

    for token in [
        "RunStateWorkspace",
        "workspace: RunStateWorkspace | null",
        "workspace_id",
        "root_dir",
        "repo_dir",
        "clone_started_at",
        "clone_finished_at",
        "cleanup_started_at",
        "cleanup_finished_at",
        "cleanup_error",
        "cleanup_pending",
        "cleanup_failed",
        "cleaned",
    ]:
        assert token in run_state, f"run state missing workspace lifecycle token: {token}"

    for token in [
        "WorkspaceCleanupSummary",
        "cleanupExpiredWorkspaces",
        "ttlMs",
        "mtimeMs",
        "await rm(fullPath, { recursive: true, force: true })",
    ]:
        assert token in workspace, f"repo-workspace missing cleanup lifecycle token: {token}"

    for token in [
        "workspaceMetadata",
        "cleanupRunWorkspace",
        "cleanupWorkspace({ root_dir: state.workspace.root_dir })",
        "state: 'cloning_repo'",
        "status: WorkspaceLifecycleStatus",
        "clone_finished_at",
        "failRunWithCleanup",
    ]:
        assert token in run_service, f"RunService missing workspace lifecycle token: {token}"

    assert "workspace_ttl_ms" in env, "runtime env must expose workspace_ttl_ms"
    assert "BOBQUEST_WORKSPACE_TTL_MS" in env, "runtime env must read BOBQUEST_WORKSPACE_TTL_MS"
    assert "cleanupExpiredWorkspaces(env.workspace_dir, env.workspace_ttl_ms)" in server, "server must run startup workspace TTL cleanup"


if __name__ == "__main__":
    main()
