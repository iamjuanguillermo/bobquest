# Backend B5 — HTTP Schemas and Normalized Errors

B5 hardens the runtime API boundary without changing product scope.

## Implemented

- Fastify route schemas for runtime write endpoints.
- Strict request bodies with `additionalProperties: false`.
- Normalized public errors with stable codes.
- Empty JSON bodies remain accepted for `POST /api/runs/:run_id/cancel`.
- Runtime service errors now use explicit BobQuest error codes.

## Error code contract

Public responses use this shape:

```json
{
  "error": {
    "code": "RUN_NOT_FOUND",
    "message": "Run state not found."
  }
}
```

Core codes added in B5:

- `INVALID_REQUEST_BODY`
- `INVALID_REPO`
- `REPO_NOT_ALLOWED`
- `RUN_NOT_FOUND`
- `RUN_NOT_READY`
- `RUN_LIMIT_REACHED`
- `EVALUATION_LIMIT_REACHED`
- `LOCALIZATION_LIMIT_REACHED`
- `BOB_UNAVAILABLE`
- `INVALID_BOB_JSON`
- `FEATURE_UNAVAILABLE`
- `RUNTIME_DISABLED`
- `WORKSPACE_UNAVAILABLE`

## Boundary preserved

B5 does not add Bob IDE, Bob Shell real execution, UI features, fallback, sample mode, import flow, PR automation, or dashboard behavior.
