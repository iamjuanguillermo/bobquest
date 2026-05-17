#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OPTIONAL = ROOT / "packages" / "optional-ibm-llm" / "src"
RUN_SERVICE = ROOT / "apps" / "runtime-api" / "src" / "services" / "RunService.ts"
LOC_SERVICE = ROOT / "apps" / "runtime-api" / "src" / "services" / "LocalizationService.ts"
CAPS = ROOT / "apps" / "runtime-api" / "src" / "services" / "CapabilityService.ts"
SERVER = ROOT / "apps" / "runtime-api" / "src" / "server.ts"
ENV = ROOT / "apps" / "runtime-api" / "src" / "env.ts"


def main() -> None:
    assert OPTIONAL.exists(), "optional IBM LLM package missing"
    combined = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in OPTIONAL.rglob("*.ts"))
    for token in [
        "WatsonxClient",
        "WatsonxJsonRecoveryAssistant",
        "WatsonxLocalizationLayer",
        "Return JSON only",
        "Do not analyze the repository",
        "Do not invent fields",
        "preserveAnalysisProtectedFields",
        "file paths",
        "commands",
        "validateAnalysisResult",
    ]:
        assert token in combined, f"optional IBM LLM package missing token: {token}"
    forbidden = ["openai", "compatible with openai", "anthropic", "gemini"]
    lowered = combined.lower()
    assert not [item for item in forbidden if item in lowered], "optional LLM must remain IBM-only"

    run_service = RUN_SERVICE.read_text(encoding="utf-8")
    assert "jsonRecoveryAssistant" in run_service, "run service must wire JSON recovery assistant"
    assert "optional_llm_json_recovery" in run_service, "JSON recovery must be gated by env feature flag"
    assert "IBM watsonx JSON recovery failed validation" in run_service, "recovered JSON must be deterministically validated"
    assert "validateOrRecoverBobAnalysis" in run_service, "Bob JSON validation/recovery pipeline missing"

    loc_service = LOC_SERVICE.read_text(encoding="utf-8")
    assert "localized_analysis" in loc_service, "localization must persist localized analysis copies"
    assert "analysis_original" in loc_service, "localization must require original Bob analysis"
    assert "active_language" in loc_service, "localization must update active language"
    assert "max_localizations_per_run" in loc_service, "localization limit missing"
    assert "Localization is unavailable" in loc_service, "disabled localization must fail clearly"

    caps = CAPS.read_text(encoding="utf-8")
    assert "optional_llm" in caps and "json_recovery" in caps and "localization" in caps, "capabilities must expose optional LLM features"
    assert "watsonxClient.availability" in caps, "capabilities must be based on watsonx env availability"

    server = SERVER.read_text(encoding="utf-8")
    assert "WatsonxClient" in server and "WatsonxJsonRecoveryAssistant" in server and "WatsonxLocalizationLayer" in server, "server must instantiate optional IBM LLM services"

    env = ENV.read_text(encoding="utf-8")
    for token in ["WATSONX_API_KEY", "WATSONX_PROJECT_ID", "WATSONX_URL", "WATSONX_MODEL_ID", "BOBQUEST_OPTIONAL_LLM_TIMEOUT_MS"]:
        assert token in env, f"env missing {token}"


if __name__ == "__main__":
    main()
