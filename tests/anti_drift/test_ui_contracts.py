#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB_SRC = ROOT / "apps" / "web" / "src"


def vue_files() -> list[Path]:
    return sorted(WEB_SRC.rglob("*.vue"))


def main() -> None:
    assert vue_files(), "no Vue files found"

    native_heading_violations: list[str] = []
    button_violations: list[str] = []
    for path in vue_files():
        text = path.read_text(encoding="utf-8", errors="ignore")
        if re.search(r"</?h[123](\s|>)", text, flags=re.IGNORECASE):
            native_heading_violations.append(str(path.relative_to(ROOT)))
        for match in re.finditer(r"<q-btn\b(?P<body>.*?)(?:/>|>)", text, flags=re.DOTALL):
            body = match.group("body")
            if "no-caps" not in body:
                button_violations.append(str(path.relative_to(ROOT)))

    assert not native_heading_violations, f"native headings found: {native_heading_violations}"
    assert not button_violations, f"q-btn without no-caps: {button_violations}"


if __name__ == "__main__":
    main()
