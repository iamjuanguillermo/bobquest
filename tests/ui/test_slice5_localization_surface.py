#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STORE = ROOT / "apps" / "web" / "src" / "state" / "bobquestStore.ts"
CLIENT = ROOT / "apps" / "web" / "src" / "api" / "runtimeClient.ts"
PAGE = ROOT / "apps" / "web" / "src" / "pages" / "OnboardingPage.vue"
CONTROLS = ROOT / "apps" / "web" / "src" / "features" / "onboarding" / "LocalizationControls.vue"
OVERLAY = ROOT / "apps" / "web" / "src" / "features" / "onboarding" / "TranslationOverlay.vue"
CSS = ROOT / "apps" / "web" / "src" / "css" / "app.scss"


def main() -> None:
    store = STORE.read_text(encoding="utf-8")
    client = CLIENT.read_text(encoding="utf-8")
    page = PAGE.read_text(encoding="utf-8")
    controls = CONTROLS.read_text(encoding="utf-8")
    overlay = OVERLAY.read_text(encoding="utf-8")
    css = CSS.read_text(encoding="utf-8")

    assert "localizeRuntimeRun" in client, "frontend client must call runtime localization endpoint"
    assert "localizedAnalysis" in store and "analysisOriginal" in store, "UI must keep original and localized analysis separately"
    assert "activeAnalysis = computed" in store, "UI must choose active analysis through computed state"
    assert "canLocalize" in store and "optionalLlm.available" in store and "optionalLlm.localization" in store, "language selector must be hidden when optional LLM is disabled"
    assert "changeLanguage" in store and "localizeRuntimeRun" in store, "language change must call backend localization"
    assert "translationError" in store and "Previous language was preserved" in store, "localization failures must preserve current content"

    assert "LocalizationControls" in page and "TranslationOverlay" in page, "onboarding page must include localization controls and overlay"
    assert "v-if=\"canLocalize()\"" in controls, "language selector must appear only when localization is available"
    assert "IBM watsonx localizes dynamic content" in controls, "UI must explain optional IBM localization boundary"
    assert "state.ui.onboarding.translating" in overlay, "translation overlay must be bound to localization state"
    assert "Translating BobQuest onboarding" in overlay, "translation overlay copy missing"
    assert "Original IBM Bob analysis remains preserved" in overlay, "overlay must state original preservation"
    assert "backdrop-filter: blur" in css and "bq-translation-overlay" in css, "translation overlay must blur/block interaction"


if __name__ == "__main__":
    main()
