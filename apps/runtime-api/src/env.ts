export interface RuntimeEnv {
  port: number;
  host: string;
  public_demo_mode: boolean;
  allowed_repos: string[];
  max_concurrent_runs: number;
  max_runs_total: number;
  max_runs_per_hour: number;
  max_evaluations_per_run: number;
  max_localizations_per_run: number;
  runtime_disabled: boolean;
  runtime_data_dir: string;
  workspace_dir: string;
  clone_timeout_ms: number;
  workspace_ttl_ms: number;
  bobshell_command: string;
  bobshell_args: string[];
  bobshell_timeout_ms: number;
  bobshell_status_args: string[];
  bobshell_status_timeout_ms: number;
  bobshell_preflight_cache_ttl_ms: number;
  bobshell_analyze_args: string[];
  bobshell_evaluate_args: string[];
  bobshell_prompt_mode: 'stdin' | 'argument';
  bobshell_prompt_arg: string;
  optional_llm_enabled: boolean;
  optional_llm_provider: 'watsonx';
  optional_llm_json_recovery: boolean;
  optional_llm_localization: boolean;
  watsonx_api_key: string | null;
  watsonx_project_id: string | null;
  watsonx_url: string | null;
  watsonx_model_id: string | null;
  watsonx_max_output_tokens: number;
  watsonx_temperature: number;
  watsonx_top_p: number;
  optional_llm_timeout_ms: number;
  optional_llm_max_retries: number;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function float(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function promptMode(value: string | undefined): 'stdin' | 'argument' {
  const normalized = String(value || 'stdin').trim().toLowerCase();
  if (normalized === 'argument') return 'argument';
  return 'stdin';
}

function list(value: string | undefined): string[] {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function loadRuntimeEnv(input: NodeJS.ProcessEnv = process.env): RuntimeEnv {
  const optionalEnabled = bool(input.BOBQUEST_OPTIONAL_LLM_ENABLED, false);
  const provider = String(input.BOBQUEST_OPTIONAL_LLM_PROVIDER || 'watsonx').toLowerCase();
  if (provider !== 'watsonx') throw new Error('Only watsonx is accepted for BOBQUEST_OPTIONAL_LLM_PROVIDER.');

  return {
    port: int(input.PORT, 8787),
    host: input.HOST || '0.0.0.0',
    public_demo_mode: bool(input.BOBQUEST_PUBLIC_DEMO_MODE, true),
    allowed_repos: list(input.BOBQUEST_ALLOWED_REPOS),
    max_concurrent_runs: int(input.BOBQUEST_MAX_CONCURRENT_RUNS, 1),
    max_runs_total: int(input.BOBQUEST_MAX_RUNS_TOTAL, 10),
    max_runs_per_hour: int(input.BOBQUEST_MAX_RUNS_PER_HOUR, 2),
    max_evaluations_per_run: int(input.BOBQUEST_MAX_EVALUATIONS_PER_RUN, 5),
    max_localizations_per_run: int(input.BOBQUEST_MAX_LOCALIZATIONS_PER_RUN, 2),
    runtime_disabled: bool(input.BOBQUEST_RUNTIME_DISABLED, false),
    runtime_data_dir: input.BOBQUEST_RUNTIME_DATA_DIR || 'data/runtime/runs',
    workspace_dir: input.BOBQUEST_WORKSPACE_DIR || 'data/runtime/workspaces',
    clone_timeout_ms: int(input.BOBQUEST_CLONE_TIMEOUT_MS, 60000),
    workspace_ttl_ms: int(input.BOBQUEST_WORKSPACE_TTL_MS, 6 * 60 * 60 * 1000),
    bobshell_command: input.BOBSHELL_COMMAND || '',
    bobshell_args: list(input.BOBSHELL_ARGS),
    bobshell_timeout_ms: int(input.BOBSHELL_TIMEOUT_MS, 180000),
    bobshell_status_args: list(input.BOBSHELL_STATUS_ARGS || '--version'),
    bobshell_status_timeout_ms: int(input.BOBSHELL_STATUS_TIMEOUT_MS, 5000),
    bobshell_preflight_cache_ttl_ms: int(input.BOBSHELL_PREFLIGHT_CACHE_TTL_MS, 60000),
    bobshell_analyze_args: list(input.BOBSHELL_ANALYZE_ARGS),
    bobshell_evaluate_args: list(input.BOBSHELL_EVALUATE_ARGS),
    bobshell_prompt_mode: promptMode(input.BOBSHELL_PROMPT_MODE),
    bobshell_prompt_arg: input.BOBSHELL_PROMPT_ARG || '-p',
    optional_llm_enabled: optionalEnabled,
    optional_llm_provider: 'watsonx',
    optional_llm_json_recovery: optionalEnabled && bool(input.BOBQUEST_OPTIONAL_LLM_JSON_RECOVERY, false),
    optional_llm_localization: optionalEnabled && bool(input.BOBQUEST_OPTIONAL_LLM_LOCALIZATION, false),
    watsonx_api_key: optionalEnabled ? input.WATSONX_API_KEY || null : null,
    watsonx_project_id: optionalEnabled ? input.WATSONX_PROJECT_ID || null : null,
    watsonx_url: optionalEnabled ? input.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com' : null,
    watsonx_model_id: optionalEnabled ? input.WATSONX_MODEL_ID || 'ibm/granite-3-2b-instruct' : null,
    watsonx_max_output_tokens: int(input.WATSONX_MAX_OUTPUT_TOKENS, 2048),
    watsonx_temperature: float(input.WATSONX_TEMPERATURE, 0),
    watsonx_top_p: float(input.WATSONX_TOP_P, 1),
    optional_llm_timeout_ms: int(input.BOBQUEST_OPTIONAL_LLM_TIMEOUT_MS, 30000),
    optional_llm_max_retries: int(input.BOBQUEST_OPTIONAL_LLM_MAX_RETRIES, 1)
  };
}
