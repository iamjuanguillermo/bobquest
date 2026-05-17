#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding='utf-8')


def main() -> None:
    env = read('apps/runtime-api/src/env.ts')
    assert "bobshell_prompt_mode: 'stdin' | 'argument'" in env
    assert "bobshell_prompt_arg: string" in env
    assert "BOBSHELL_PROMPT_MODE" in env
    assert "BOBSHELL_PROMPT_ARG" in env
    assert "promptMode(input.BOBSHELL_PROMPT_MODE)" in env

    adapter = read('packages/bob-shell-runtime/src/BobShellAdapter.ts')
    assert "buildExecutionArgs" in adapter
    assert "prompt_mode ?? 'stdin'" in adapter
    assert "prompt_arg || '-p'" in adapter
    assert "[...baseArgs, promptArg, request.prompt]" in adapter
    assert "stdio: ['pipe', 'pipe', 'pipe']" in adapter
    assert "child.stdin.write(stdinPayload)" in adapter
    assert "child.stdin.end()" in adapter

    types = read('packages/bob-shell-runtime/src/bobShellTypes.ts')
    assert "export type BobShellPromptMode = 'stdin' | 'argument'" in types
    assert "prompt_mode?: BobShellPromptMode" in types
    assert "prompt_arg?: string" in types

    server = read('apps/runtime-api/src/server.ts')
    assert "prompt_mode: env.bobshell_prompt_mode" in server
    assert "prompt_arg: env.bobshell_prompt_arg" in server

    fake = read('scripts/fake-bob-shell.mjs')
    assert "readPromptFromArgs" in fake
    assert "BOBQUEST_FAKE_BOB_EXPECT_PROMPT_MODE" in fake
    assert "Expected prompt to be passed as a command argument" in fake

    env_example = read('.env.real-bob.example')
    assert "BOBSHELL_COMMAND=bob" in env_example
    assert "BOBSHELL_ANALYZE_ARGS=--auth-method,api-key" in env_example
    assert "BOBSHELL_EVALUATE_ARGS=--auth-method,api-key" in env_example
    assert "BOBSHELL_PROMPT_MODE=argument" in env_example
    assert "BOBSHELL_PROMPT_ARG=-p" in env_example
    assert "BOBSHELL_API_KEY=" in env_example

    package_json = read('package.json')
    assert "test:backend-real-bob-cli-mode" in package_json

    print('B12 real Bob CLI prompt mode contract checks passed.')


if __name__ == '__main__':
    main()
