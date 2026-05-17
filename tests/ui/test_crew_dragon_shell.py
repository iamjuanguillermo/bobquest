#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "apps" / "web" / "src" / "pages" / "IndexPage.vue"
DEV = ROOT / "apps" / "web" / "src" / "pages" / "DevPage.vue"
REPO_PANEL = ROOT / "apps" / "web" / "src" / "features" / "repo-run" / "RepoRunPanel.vue"
ONBOARDING = ROOT / "apps" / "web" / "src" / "features" / "onboarding" / "LockedOnboarding.vue"
CSS = ROOT / "apps" / "web" / "src" / "css" / "app.scss"


def main() -> None:
    index_text = INDEX.read_text(encoding="utf-8")
    dev_text = DEV.read_text(encoding="utf-8")
    repo_text = REPO_PANEL.read_text(encoding="utf-8")
    onboarding_text = ONBOARDING.read_text(encoding="utf-8")
    css_text = CSS.read_text(encoding="utf-8")

    assert "Analyze repository" in index_text, "home page must have one obvious primary action"
    assert "RepoRunPanel" in dev_text and "RunStatusPanel" in dev_text, "runtime entry must remain focused"
    assert "Approved repository" in repo_text, "public restricted mode must use approved repo selection"
    assert "GitHub repository URL" in repo_text, "self-hosted mode must allow GitHub URL"
    assert "Public restricted mode" in repo_text, "public restriction warning missing"
    assert "No run is ready yet" in onboarding_text, "onboarding must be locked without ready run"
    assert "backdrop-filter" in css_text, "shell should use refined surface styling"
    assert "bq-runtime-grid" in css_text, "runtime page needs intentional layout"


if __name__ == "__main__":
    main()
