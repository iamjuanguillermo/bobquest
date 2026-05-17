# BobQuest v0.23 Runtime Architecture

BobQuest uses IBM Bob Shell as the runtime brain for repository analysis and open-text evaluation. The product path is:

```text
Quasar UI
→ Fastify runtime API
→ GitHub validation and shallow clone
→ IBM Bob Shell prompt
→ JSON extraction and deterministic validation
→ file-based run_state
→ flow-guided onboarding UI
```

## Optional IBM LLM boundary

`@bobquest/optional-ibm-llm` is IBM-only. It supports:

1. JSON Recovery Assistant after deterministic Bob JSON failure.
2. Localization Layer for already-rendered dynamic BobQuest onboarding content.

It does not analyze repositories, replace Bob Shell, rank missions, classify issues or evaluate open-ended understanding as the primary judge.

Localization preserves `analysis_original`, writes translated copies under `localized_analysis[language]`, and keeps file paths, commands, ids, enum values, URLs and package names unchanged.
