#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INTERACTION = ROOT / "apps" / "web" / "src" / "features" / "onboarding" / "InteractionRenderer.vue"
MISSION = ROOT / "apps" / "web" / "src" / "features" / "onboarding" / "StarterMissionPanel.vue"


def main() -> None:
    text = INTERACTION.read_text(encoding="utf-8")
    mission = MISSION.read_text(encoding="utf-8")
    for token in [
        "single_choice",
        "multi_choice",
        "short_text",
        "confirm_understanding",
        "file_focus",
        "open_text_evaluated_by_bob",
        "Check locally",
        "Evaluate with IBM Bob Shell",
        "completeActiveClosedMission",
        "evaluateActiveOpenMission",
        "missionResult",
        "missionError",
    ]:
        assert token in text, f"InteractionRenderer missing {token}"
    assert "InteractionRenderer" in mission, "starter mission panel must use InteractionRenderer"
    for match in re.finditer(r"<q-btn\b(?P<body>.*?)(?:/>|>)", text, flags=re.DOTALL):
        assert "no-caps" in match.group("body"), "InteractionRenderer q-btn must include no-caps"


if __name__ == "__main__":
    main()
