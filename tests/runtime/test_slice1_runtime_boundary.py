#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STORE = ROOT / "apps" / "web" / "src" / "state" / "bobquestStore.ts"
PROMPTS = ROOT / "prompts" / "bob-shell"


def main() -> None:
    store_text = STORE.read_text(encoding="utf-8")
    assert "bobShellRuntime" in store_text, "UI state must model Bob Shell runtime capability"
    assert "No product fallback" in store_text, "missing hard failure message for unavailable runtime"
    assert "requestRuntimeRun" in store_text, "run request boundary missing"
    assert (PROMPTS / "analyze_repo.md").exists(), "analyze prompt missing"
    assert (PROMPTS / "evaluate_answer.md").exists(), "evaluate prompt missing"
    assert (PROMPTS / "repair_json.md").exists(), "repair prompt missing"
    for prompt in PROMPTS.glob("*.md"):
      text = prompt.read_text(encoding="utf-8")
      assert "Return JSON only" in text, f"{prompt.name} must require JSON only"


if __name__ == "__main__":
    main()
