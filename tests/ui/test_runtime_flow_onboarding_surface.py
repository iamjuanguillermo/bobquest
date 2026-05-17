#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ONBOARDING_PAGE = ROOT / "apps" / "web" / "src" / "pages" / "OnboardingPage.vue"
STORE = ROOT / "apps" / "web" / "src" / "state" / "bobquestStore.ts"
FLOW_OVERVIEW = ROOT / "apps" / "web" / "src" / "features" / "onboarding" / "FlowOverview.vue"
FLOW_STEP = ROOT / "apps" / "web" / "src" / "features" / "onboarding" / "FlowStepPanel.vue"
MISSION = ROOT / "apps" / "web" / "src" / "features" / "onboarding" / "StarterMissionPanel.vue"
INTERACTION = ROOT / "apps" / "web" / "src" / "features" / "onboarding" / "InteractionRenderer.vue"
EVIDENCE = ROOT / "apps" / "web" / "src" / "features" / "onboarding" / "EvidenceDrawer.vue"
EXPLANATION = ROOT / "apps" / "web" / "src" / "features" / "onboarding" / "BobExplanationDrawer.vue"
CSS = ROOT / "apps" / "web" / "src" / "css" / "app.scss"


def main() -> None:
    page = ONBOARDING_PAGE.read_text(encoding="utf-8")
    store = STORE.read_text(encoding="utf-8")
    overview = FLOW_OVERVIEW.read_text(encoding="utf-8")
    step = FLOW_STEP.read_text(encoding="utf-8")
    mission = MISSION.read_text(encoding="utf-8")
    interaction = INTERACTION.read_text(encoding="utf-8")
    evidence = EVIDENCE.read_text(encoding="utf-8")
    explanation = EXPLANATION.read_text(encoding="utf-8")
    css = CSS.read_text(encoding="utf-8")

    assert "activeAnalysis && activeFlow" in page, "onboarding must render only from ready runtime analysis"
    assert "FlowOverview" in page and "FlowStepPanel" in page and "StarterMissionPanel" in page, "flow onboarding panels missing"
    assert "EvidenceDrawer" in page and "BobExplanationDrawer" in page, "details must be hidden behind reveal surfaces"

    assert "analysisOriginal" in store, "runtime analysis must be kept in UI state"
    assert "recommended_first_flow_id" in store, "initial onboarding selection must honor Bob recommended flow"
    assert "activeFlow" in store and "activeStep" in store and "activeMission" in store, "active onboarding selectors missing"
    assert "syncOnboardingSelection" in store, "ready run must initialize flow, step and mission selection"

    assert "activeAnalysis.flows" in overview, "flow overview must render runtime flows"
    assert "selectFlow(flow.id)" in overview, "flow overview must allow changing active flow"
    assert "activeFlow.steps" in step, "flow step panel must render runtime steps"
    assert "openExplanationDrawer" in step and "openEvidenceDrawer" in step, "step details must be progressive reveal"
    assert "mission.interaction.prompt" in interaction, "interaction renderer must expose runtime-generated interaction prompt"
    assert "InteractionRenderer" in mission, "starter mission must delegate checkpoint UI to interaction renderer"
    assert "Evaluate with IBM Bob Shell" in interaction, "open text checkpoint must call Bob Shell evaluation route"
    assert "Check locally" in interaction, "closed checkpoints must validate locally"

    assert "activeStep.files" in evidence and "activeStep.tests" in evidence and "activeStep.evidence" in evidence, "evidence drawer must render files, tests and Bob evidence"
    assert "activeStep.bob_explanation" in explanation, "explanation drawer must render Bob explanation"

    assert "bq-onboarding-grid" in css and "bq-detail-drawer" in css, "Crew Dragon onboarding layout styles missing"
    assert "position: sticky" in css, "flow overview should stay available without becoming a dense dashboard"


if __name__ == "__main__":
    main()
