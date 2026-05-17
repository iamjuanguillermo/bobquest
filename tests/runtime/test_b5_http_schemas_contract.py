#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
API = ROOT / "apps" / "runtime-api" / "src"

REQUIRED_FILES = [
    API / "routes" / "schemas.ts",
    API / "security" / "errorResponse.ts",
]

REQUIRED_TOKENS = [
    "RuntimeApiErrorCode",
    "INVALID_REQUEST_BODY",
    "INVALID_REPO",
    "REPO_NOT_ALLOWED",
    "RUN_NOT_FOUND",
    "RUN_NOT_READY",
    "RUN_LIMIT_REACHED",
    "EVALUATION_LIMIT_REACHED",
    "LOCALIZATION_LIMIT_REACHED",
    "BOB_UNAVAILABLE",
    "INVALID_BOB_JSON",
    "FEATURE_UNAVAILABLE",
    "RUNTIME_DISABLED",
    "WORKSPACE_UNAVAILABLE",
    "createRunSchema",
    "getRunSchema",
    "cancelRunSchema",
    "completeObjectiveSchema",
    "evaluateObjectiveSchema",
    "preferencesSchema",
    "localizeSchema",
    "additionalProperties: false",
]

ROUTE_SCHEMA_TOKENS = [
    "{ schema: createRunSchema }",
    "{ schema: getRunSchema }",
    "{ schema: cancelRunSchema }",
    "{ schema: completeObjectiveSchema }",
    "{ schema: evaluateObjectiveSchema }",
    "{ schema: preferencesSchema }",
    "{ schema: localizeSchema }",
]


def main() -> None:
    for path in REQUIRED_FILES:
        assert path.exists(), f"missing backend B5 file: {path.relative_to(ROOT)}"

    text = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in API.rglob("*.ts"))
    missing = [token for token in REQUIRED_TOKENS if token not in text]
    assert not missing, f"backend B5 missing tokens: {missing}"

    missing_route_tokens = [token for token in ROUTE_SCHEMA_TOKENS if token not in text]
    assert not missing_route_tokens, f"routes missing schema registration: {missing_route_tokens}"

    assert "reply.code(statusCode).send(publicError(error))" not in text, "old generic error handler must not remain"
    assert "BOBQUEST_RUNTIME_ERROR', message, 500" in text, "unexpected errors must normalize to one public code"


if __name__ == "__main__":
    main()
