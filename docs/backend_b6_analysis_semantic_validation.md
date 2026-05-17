# Backend B6 — AnalysisResult semantic validation

B6 strengthens the deterministic `AnalysisResult` validator used after IBM Bob Shell analysis and after optional IBM JSON recovery.

The validator now rejects Bob output that is structurally shaped like BobQuest JSON but semantically unsafe or incoherent.

## New semantic gates

- `recommended_first_flow_id` must reference an existing flow id.
- Flow ids must be unique.
- Step ids must be unique within each flow.
- Starter mission ids must be unique across the analysis.
- `starter_missions[].flow_step_id` must reference a step in the same flow.
- `single_choice.correct_option_id` must reference an existing option id.
- `multi_choice.correct_option_ids[]` must reference existing option ids.
- Option ids must be unique inside each interaction.
- Repo references require non-empty `path` and `reason`.
- Test references require non-empty `command` and `reason`.
- Open-text Bob-evaluated interactions must not include local answer keys or local success/failure messages.
- Closed interactions must include sufficient local validation data.

## Runtime behavior

The existing runtime path is unchanged:

```text
Bob Shell stdout
→ JSON extraction
→ validateAnalysisResult
→ ready if valid
→ INVALID_BOB_JSON if invalid
```

If optional IBM JSON recovery is enabled, recovery output still goes through the same deterministic validator before becoming `analysis_original`.
