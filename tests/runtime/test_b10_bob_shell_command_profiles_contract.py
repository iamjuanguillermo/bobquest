#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def main() -> None:
    types = read('packages/bob-shell-runtime/src/bobShellTypes.ts')
    adapter = read('packages/bob-shell-runtime/src/BobShellAdapter.ts')
    env = read('apps/runtime-api/src/env.ts')
    server = read('apps/runtime-api/src/server.ts')
    fake_bob = read('scripts/fake-bob-shell.mjs')
    package_json = read('package.json')
    run_all = read('tests/run_all.py')

    assert 'analyze_args?: string[]' in types, 'BobShellCommandConfig must expose analyze_args'
    assert 'evaluate_args?: string[]' in types, 'BobShellCommandConfig must expose evaluate_args'
    assert 'argsForPurpose' in adapter, 'BobShellAdapter must select command args by purpose'
    assert "purpose === 'analyze_repo'" in adapter, 'analyze_repo must have a purpose-specific arg path'
    assert "purpose === 'evaluate_answer'" in adapter, 'evaluate_answer must have a purpose-specific arg path'
    assert 'return [...this.config.args]' in adapter, 'common BOBSHELL_ARGS fallback must remain available'

    assert 'bobshell_analyze_args' in env, 'RuntimeEnv must parse BOBSHELL_ANALYZE_ARGS'
    assert 'bobshell_evaluate_args' in env, 'RuntimeEnv must parse BOBSHELL_EVALUATE_ARGS'
    assert 'analyze_args: env.bobshell_analyze_args' in server, 'server must pass analyze args to BobShellAdapter'
    assert 'evaluate_args: env.bobshell_evaluate_args' in server, 'server must pass evaluate args to BobShellAdapter'

    assert 'BOBQUEST_FAKE_BOB_EXPECT_ANALYZE_ARGS' in fake_bob, 'fake Bob must validate analyze args in tests'
    assert 'BOBQUEST_FAKE_BOB_EXPECT_EVALUATE_ARGS' in fake_bob, 'fake Bob must validate evaluate args in tests'
    assert 'test:backend-command-profiles' in package_json, 'package.json must expose B10 test script'
    assert 'test_b10_bob_shell_command_profiles_contract.py' in run_all, 'accumulated tests must include B10 contract'
    assert 'test_b10_bob_shell_command_profiles_e2e.py' in run_all, 'accumulated tests must include B10 E2E'
    print('B10 command profiles contract checks passed.')


if __name__ == '__main__':
    main()
