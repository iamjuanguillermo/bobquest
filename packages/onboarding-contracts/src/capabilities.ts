export interface RuntimeCapabilities {
  public_demo_mode: boolean;
  allowed_repos: Array<{
    id: string;
    label: string;
    url: string;
  }>;
  bob_shell_runtime: {
    available: boolean;
    required: true;
    status: 'ready' | 'not_configured' | 'binary_not_found' | 'preflight_failed' | 'auth_invalid' | 'disabled' | 'unknown';
    message?: string;
    version?: string;
    last_check_at?: string;
  };
  optional_llm: {
    available: boolean;
    provider: 'watsonx';
    model_id: string | null;
    features: {
      json_recovery: boolean;
      localization: boolean;
    };
  };
  limits: {
    max_concurrent_runs: number;
    max_runs_total: number;
    max_runs_per_hour: number;
    max_evaluations_per_run: number;
    max_localizations_per_run: number;
  };
}
