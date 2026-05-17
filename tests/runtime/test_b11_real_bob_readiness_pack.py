#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def assert_contains(path: str, needle: str) -> None:
    text = read(path)
    assert needle in text, f'{path} must contain {needle!r}'


def main() -> None:
    smoke = read('scripts/real-bob-runtime-smoke.mjs')
    env_example = read('.env.real-bob.example')
    docs = read('docs/backend_b11_real_bob_readiness.md')
    package = json.loads(read('package.json'))
    run_all = read('tests/run_all.py')

    assert 'I_ACCEPT_ONE_BOB_SHELL_RUNTIME_RUN' in smoke, 'real smoke script must require explicit ACK before creating a run'
    assert 'BOBQUEST_REAL_BOB_SMOKE_ACK' in smoke, 'real smoke script must check ACK env var'
    assert '--run-once' in smoke and '--status-only' in smoke, 'real smoke script must separate safe status mode from run mode'
    assert '/api/bob/status?force_check=true' in smoke, 'real smoke script must force Bob Shell preflight before real smoke'
    assert 'POST' in smoke and '/api/runs' in smoke, 'real smoke script must create the run through runtime API only'
    assert 'fake-bob-shell' in smoke and 'Refusing real Bob smoke' in smoke, 'real smoke script must reject fake Bob Shell path'
    assert 'eval(' not in smoke and 'spawn(' not in smoke, 'real smoke script must not spawn Bob Shell directly or eval code'
    assert 'BOBQUEST_REAL_BOB_SMOKE_REPO_ID' in smoke, 'real smoke script must support repo_id for public demo mode'
    assert 'BOBQUEST_REAL_BOB_SMOKE_REPO_URL' in smoke, 'real smoke script must support repo_url for self-hosted mode'

    assert 'BOBSHELL_COMMAND=bob' in env_example, '.env.real-bob.example must use the documented Bob Shell command by default'
    assert 'scripts/fake-bob-shell.mjs' not in env_example, '.env.real-bob.example must not point to fake Bob Shell'
    assert 'BOBQUEST_MAX_RUNS_TOTAL=3' in env_example, '.env.real-bob.example must keep real smoke limits low'
    assert 'BOBQUEST_MAX_RUNS_PER_HOUR=1' in env_example, '.env.real-bob.example must avoid repeated accidental runs'
    assert 'BOBQUEST_OPTIONAL_LLM_ENABLED=false' in env_example, 'first real smoke must not depend on optional LLM'
    assert 'BOBQUEST_REAL_BOB_SMOKE_ACK=I_ACCEPT_ONE_BOB_SHELL_RUNTIME_RUN' in env_example, 'env example must document the ACK clearly'

    assert 'pnpm smoke:real-bob:status' in docs, 'B11 docs must include safe status command'
    assert 'pnpm smoke:real-bob:run-once' in docs, 'B11 docs must include guarded run command'
    assert 'creates no run' in docs.lower(), 'B11 docs must state status-only creates no run'
    assert 'does not:' in docs and 'install IBM Bob Shell' in docs, 'B11 docs must define non-goals'

    scripts = package['scripts']
    assert scripts['test:backend-real-bob-readiness'] == 'python3 -u tests/runtime/test_b11_real_bob_readiness_pack.py'
    assert scripts['smoke:real-bob:status'] == 'node scripts/real-bob-runtime-smoke.mjs --status-only'
    assert scripts['smoke:real-bob:run-once'] == 'node scripts/real-bob-runtime-smoke.mjs --run-once'
    assert 'test_b11_real_bob_readiness_pack.py' in run_all, 'B11 test must be part of accumulated tests'
    assert package['version'] == '0.23.12-backend-b12'

    assert re.search(r'await\s+checkStatus\(apiBaseUrl\);\s*\n\s*const runBody = buildRunBody\(\);', smoke), 'run-once must check status before creating run'
    print('B11 real Bob readiness pack checks passed.')


if __name__ == '__main__':
    main()
