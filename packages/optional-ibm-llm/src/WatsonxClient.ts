import type { OptionalIbmLlmAvailability, WatsonxConfig, WatsonxGenerateInput } from './types';

export class WatsonxClient {
  constructor(private readonly config: WatsonxConfig) {}

  availability(): OptionalIbmLlmAvailability {
    const missing: string[] = [];
    if (!this.config.enabled) missing.push('BOBQUEST_OPTIONAL_LLM_ENABLED');
    if (!this.config.api_key) missing.push('WATSONX_API_KEY');
    if (!this.config.project_id) missing.push('WATSONX_PROJECT_ID');
    if (!this.config.url) missing.push('WATSONX_URL');
    if (!this.config.model_id) missing.push('WATSONX_MODEL_ID');
    return {
      available: missing.length === 0,
      provider: 'watsonx',
      model_id: missing.length === 0 ? this.config.model_id : null,
      missing
    };
  }

  async generate(input: WatsonxGenerateInput): Promise<string> {
    const availability = this.availability();
    if (!availability.available) {
      throw new Error(`Optional IBM watsonx LLM is unavailable: ${availability.missing.join(', ')}`);
    }

    const endpoint = `${String(this.config.url).replace(/\/$/, '')}/ml/v1/text/generation?version=2023-05-29`;
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= this.config.max_retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeout_ms);
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.config.api_key}`,
            'content-type': 'application/json',
            accept: 'application/json'
          },
          signal: controller.signal,
          body: JSON.stringify({
            model_id: this.config.model_id,
            project_id: this.config.project_id,
            input: input.prompt,
            parameters: {
              max_new_tokens: this.config.max_output_tokens,
              temperature: this.config.temperature,
              top_p: this.config.top_p,
              decoding_method: this.config.temperature === 0 ? 'greedy' : 'sample'
            }
          })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.errors?.[0]?.message ?? payload?.message ?? `watsonx request failed: ${response.status}`);
        }
        const generated = payload?.results?.[0]?.generated_text;
        if (typeof generated !== 'string' || !generated.trim()) {
          throw new Error(`watsonx returned empty text for ${input.purpose}.`);
        }
        return generated;
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`watsonx ${input.purpose} request failed.`);
  }
}
