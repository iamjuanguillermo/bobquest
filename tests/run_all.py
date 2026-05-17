#!/usr/bin/env python3
from __future__ import annotations

import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TESTS = [
    ROOT / "tests" / "anti_drift" / "test_no_obsolete_product_paths.py",
    ROOT / "tests" / "anti_drift" / "test_ui_contracts.py",
    ROOT / "tests" / "anti_drift" / "test_no_worker_runtime.py",
    ROOT / "tests" / "anti_drift" / "test_no_product_endpoints.py",
    ROOT / "tests" / "contracts" / "test_analysis_result_schema.py",
    ROOT / "tests" / "contracts" / "test_run_state_schema.py",
    ROOT / "tests" / "contracts" / "test_evaluation_contracts.py",
    ROOT / "tests" / "runtime" / "test_slice1_runtime_boundary.py",
    ROOT / "tests" / "runtime" / "test_runtime_api_structure.py",
    ROOT / "tests" / "runtime" / "test_bob_shell_runtime_contract.py",
    ROOT / "tests" / "runtime" / "test_repo_workspace_contract.py",
    ROOT / "tests" / "runtime" / "test_runtime_state_store_contract.py",
    ROOT / "tests" / "runtime" / "test_runtime_hard_failure_contract.py",
    ROOT / "tests" / "runtime" / "test_slice4_objective_evaluation_contract.py",
    ROOT / "tests" / "runtime" / "test_slice5_optional_ibm_llm_contract.py",
    ROOT / "tests" / "runtime" / "test_b1_fake_bob_shell_e2e.py",
    ROOT / "tests" / "runtime" / "test_b2_process_registry_contract.py",
    ROOT / "tests" / "runtime" / "test_b2_process_registry_cancellation.py",
    ROOT / "tests" / "runtime" / "test_b3_workspace_lifecycle_contract.py",
    ROOT / "tests" / "runtime" / "test_b3_workspace_lifecycle_e2e.py",
    ROOT / "tests" / "runtime" / "test_b4_open_evaluation_workspace_contract.py",
    ROOT / "tests" / "runtime" / "test_b4_open_evaluation_workspace_e2e.py",
    ROOT / "tests" / "runtime" / "test_b5_http_schemas_contract.py",
    ROOT / "tests" / "runtime" / "test_b5_http_schemas_e2e.py",
    ROOT / "tests" / "runtime" / "test_b6_analysis_semantic_validation_contract.py",
    ROOT / "tests" / "runtime" / "test_b7_runtime_limits_contract.py",
    ROOT / "tests" / "runtime" / "test_b7_runtime_limits_e2e.py",
    ROOT / "tests" / "runtime" / "test_b8_observability_contract.py",
    ROOT / "tests" / "runtime" / "test_b8_observability_e2e.py",
    ROOT / "tests" / "runtime" / "test_b9_bob_preflight_contract.py",
    ROOT / "tests" / "runtime" / "test_b9_bob_preflight_e2e.py",
    ROOT / "tests" / "runtime" / "test_b10_bob_shell_command_profiles_contract.py",
    ROOT / "tests" / "runtime" / "test_b10_bob_shell_command_profiles_e2e.py",
    ROOT / "tests" / "runtime" / "test_b11_real_bob_readiness_pack.py",
    ROOT / "tests" / "runtime" / "test_b12_real_bob_cli_prompt_mode_contract.py",
    ROOT / "tests" / "runtime" / "test_b12_real_bob_cli_prompt_mode_e2e.py",
    ROOT / "tests" / "ui" / "test_crew_dragon_shell.py",
    ROOT / "tests" / "ui" / "test_runtime_flow_onboarding_surface.py",
    ROOT / "tests" / "ui" / "test_slice4_interactions_surface.py",
    ROOT / "tests" / "ui" / "test_slice5_localization_surface.py",
    ROOT / "tests" / "deploy" / "test_docker_vps_hardening.py",
    ROOT / "tests" / "deploy" / "test_real_bob_docker_runtime.py",
]


def main() -> int:
    for test in TESTS:
        print(f"=== {test.relative_to(ROOT)} ===")
        runpy.run_path(str(test), run_name="__main__")
    print("All BobQuest v0.23.13 Backend B13 tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
