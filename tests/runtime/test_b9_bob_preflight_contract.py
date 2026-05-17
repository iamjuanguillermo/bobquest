#!/usr/bin/env python3
"""
Backend B9 — Bob Shell Real Preflight — Contract Tests

Validates that B9 types, contracts, and configuration are correctly defined.
Does not execute runtime or Bob Shell.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_bob_shell_status_type_exists() -> None:
    """Verify BobShellStatus type is exported from bob-shell-runtime."""
    status_file = ROOT / "packages/bob-shell-runtime/src/bobShellStatus.ts"
    assert status_file.exists(), "bobShellStatus.ts must exist"
    
    content = status_file.read_text(encoding="utf-8")
    assert "export type BobShellStatus" in content, "BobShellStatus type must be exported"
    
    # Verify all expected status values
    expected_statuses = [
        "'ready'",
        "'not_configured'",
        "'binary_not_found'",
        "'preflight_failed'",
        "'auth_invalid'",
        "'disabled'",
        "'unknown'"
    ]
    for status in expected_statuses:
        assert status in content, f"BobShellStatus must include {status}"


def test_bob_shell_status_result_interface() -> None:
    """Verify BobShellStatusResult interface has required fields."""
    status_file = ROOT / "packages/bob-shell-runtime/src/bobShellStatus.ts"
    content = status_file.read_text(encoding="utf-8")
    
    assert "export interface BobShellStatusResult" in content
    
    required_fields = [
        "available: boolean",
        "status: BobShellStatus",
        "message: string"
    ]
    optional_fields = [
        "version?: string",
        "command_path?: string",
        "preflight_duration_ms?: number",
        "last_check_at?: string"
    ]
    
    for field in required_fields:
        assert field in content, f"BobShellStatusResult must have {field}"
    
    for field in optional_fields:
        assert field in content, f"BobShellStatusResult must have {field}"


def test_bob_shell_error_classes_exist() -> None:
    """Verify new error classes are defined in bobShellTypes.ts."""
    types_file = ROOT / "packages/bob-shell-runtime/src/bobShellTypes.ts"
    content = types_file.read_text(encoding="utf-8")
    
    error_classes = [
        "BobShellNotConfiguredError",
        "BobShellBinaryNotFoundError",
        "BobShellPreflightFailedError"
    ]
    
    for error_class in error_classes:
        assert f"export class {error_class}" in content, f"{error_class} must be exported"
        assert f"override name = '{error_class}'" in content, f"{error_class} must set name property"


def test_runtime_env_has_preflight_fields() -> None:
    """Verify RuntimeEnv interface includes preflight configuration fields."""
    env_file = ROOT / "apps/runtime-api/src/env.ts"
    content = env_file.read_text(encoding="utf-8")
    
    required_fields = [
        "bobshell_status_args: string[]",
        "bobshell_status_timeout_ms: number",
        "bobshell_preflight_cache_ttl_ms: number",
        "bobshell_analyze_args: string[]",
        "bobshell_evaluate_args: string[]"
    ]
    
    for field in required_fields:
        assert field in content, f"RuntimeEnv must include {field}"


def test_runtime_env_loads_preflight_vars() -> None:
    """Verify loadRuntimeEnv() parses preflight environment variables."""
    env_file = ROOT / "apps/runtime-api/src/env.ts"
    content = env_file.read_text(encoding="utf-8")
    
    # Check that new env vars are parsed
    assert "BOBSHELL_STATUS_ARGS" in content
    assert "BOBSHELL_STATUS_TIMEOUT_MS" in content
    assert "BOBSHELL_PREFLIGHT_CACHE_TTL_MS" in content
    assert "BOBSHELL_ANALYZE_ARGS" in content
    assert "BOBSHELL_EVALUATE_ARGS" in content
    
    # Check defaults
    assert "'--version'" in content or '"--version"' in content, "Default status args should be --version"
    assert "5000" in content, "Default status timeout should be 5000ms"
    assert "60000" in content, "Default cache TTL should be 60000ms"


def test_capabilities_contract_updated() -> None:
    """Verify RuntimeCapabilities.bob_shell_runtime has new fields."""
    capabilities_file = ROOT / "packages/onboarding-contracts/src/capabilities.ts"
    content = capabilities_file.read_text(encoding="utf-8")
    
    # Check status union includes new values
    status_values = [
        "'ready'",
        "'not_configured'",
        "'binary_not_found'",
        "'preflight_failed'",
        "'auth_invalid'",
        "'disabled'",
        "'unknown'"
    ]
    
    for status in status_values:
        assert status in content, f"bob_shell_runtime.status must include {status}"
    
    # Check optional fields
    assert "version?: string" in content
    assert "last_check_at?: string" in content


def test_error_codes_include_preflight() -> None:
    """Verify RuntimeApiErrorCode includes preflight error codes."""
    error_file = ROOT / "apps/runtime-api/src/security/errorResponse.ts"
    content = error_file.read_text(encoding="utf-8")
    
    error_codes = [
        "'BOB_NOT_CONFIGURED'",
        "'BOB_BINARY_NOT_FOUND'",
        "'BOB_PREFLIGHT_FAILED'"
    ]
    
    for code in error_codes:
        assert code in content, f"RuntimeApiErrorCode must include {code}"


def test_error_normalization_handles_preflight_errors() -> None:
    """Verify normalizeRuntimeError() maps preflight error classes."""
    error_file = ROOT / "apps/runtime-api/src/security/errorResponse.ts"
    content = error_file.read_text(encoding="utf-8")
    
    mappings = [
        ("BobShellNotConfiguredError", "BOB_NOT_CONFIGURED"),
        ("BobShellBinaryNotFoundError", "BOB_BINARY_NOT_FOUND"),
        ("BobShellPreflightFailedError", "BOB_PREFLIGHT_FAILED")
    ]
    
    for error_class, error_code in mappings:
        assert error_class in content, f"normalizeRuntimeError must handle {error_class}"
        assert error_code in content, f"normalizeRuntimeError must map to {error_code}"


def test_env_example_documents_preflight_vars() -> None:
    """Verify .env.example includes preflight configuration."""
    env_example = ROOT / ".env.example"
    content = env_example.read_text(encoding="utf-8")
    
    required_vars = [
        "BOBSHELL_STATUS_ARGS",
        "BOBSHELL_STATUS_TIMEOUT_MS",
        "BOBSHELL_PREFLIGHT_CACHE_TTL_MS",
        "BOBSHELL_ANALYZE_ARGS",
        "BOBSHELL_EVALUATE_ARGS"
    ]
    
    for var in required_vars:
        assert var in content, f".env.example must document {var}"


def test_bob_shell_adapter_exports_status_types() -> None:
    """Verify bob-shell-runtime package exports status types."""
    index_file = ROOT / "packages/bob-shell-runtime/src/index.ts"
    content = index_file.read_text(encoding="utf-8")
    
    assert "bobShellStatus" in content, "index.ts must export from bobShellStatus"


def main() -> None:
    """Run all contract tests."""
    tests = [
        test_bob_shell_status_type_exists,
        test_bob_shell_status_result_interface,
        test_bob_shell_error_classes_exist,
        test_runtime_env_has_preflight_fields,
        test_runtime_env_loads_preflight_vars,
        test_capabilities_contract_updated,
        test_error_codes_include_preflight,
        test_error_normalization_handles_preflight_errors,
        test_env_example_documents_preflight_vars,
        test_bob_shell_adapter_exports_status_types
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            print(f"✓ {test.__name__}")
            passed += 1
        except AssertionError as error:
            print(f"✗ {test.__name__}: {error}")
            failed += 1
        except Exception as error:
            print(f"✗ {test.__name__}: unexpected error: {error}")
            failed += 1
    
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()

# Made with Bob
