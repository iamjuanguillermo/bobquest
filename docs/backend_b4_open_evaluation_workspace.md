# Backend B4 — Open evaluation uses the run workspace

B4 completes the backend wiring for open-text onboarding objectives.

## Contract

Open-text objectives must be evaluated by IBM Bob Shell from the original cloned repository workspace persisted in `run_state.workspace.repo_dir`.

The backend must not use `process.cwd()` as the repository workspace because the runtime API process cwd is the BobQuest repo, not the analyzed repo.

## Runtime path

```text
POST /api/runs/:run_id/objectives/:objective_id/evaluate
→ require run.state === ready
→ require analysis_original
→ find objective in IBM Bob analysis
→ require interaction.type === open_text_evaluated_by_bob
→ require run_state.workspace.status === cloned
→ execute Bob Shell with cwd = run_state.workspace.repo_dir
→ validate EvaluationResult
→ persist objective_progress
→ return run to ready
```

## Cancellation compatibility

`EvaluationService` shares the same `BobProcessRegistry` as `RunService`, so `POST /api/runs/:run_id/cancel` can cancel a Bob Shell process running an evaluation.

## Test

```bash
pnpm test:backend-evaluation-workspace
```
