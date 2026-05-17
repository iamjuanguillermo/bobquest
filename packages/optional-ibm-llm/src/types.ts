export interface WatsonxConfig {
  enabled: boolean;
  provider: 'watsonx';
  api_key: string | null;
  project_id: string | null;
  url: string | null;
  model_id: string;
  max_output_tokens: number;
  temperature: number;
  top_p: number;
  timeout_ms: number;
  max_retries: number;
}

export interface WatsonxGenerateInput {
  prompt: string;
  purpose: 'json_recovery' | 'localization';
}

export interface OptionalIbmLlmAvailability {
  available: boolean;
  provider: 'watsonx';
  model_id: string | null;
  missing: string[];
}
