import { BobShellAdapter } from '@bobquest/bob-shell-runtime';
import type { RuntimeCapabilities } from '@bobquest/onboarding-contracts';
import type { WatsonxClient } from '@bobquest/optional-ibm-llm';
import type { RuntimeEnv } from '../env';
import { allowedRepoOptions } from '../security/repoAllowlist';

export class CapabilityService {
  constructor(
    private readonly env: RuntimeEnv,
    private readonly bobShell: BobShellAdapter,
    private readonly watsonxClient: WatsonxClient
  ) {}

  async capabilities(): Promise<RuntimeCapabilities> {
    const bobStatus = await this.bobShell.status();

    const watsonx = this.watsonxClient.availability();
    const optionalReady =
      this.env.optional_llm_enabled &&
      this.env.optional_llm_provider === 'watsonx' &&
      watsonx.available;

    const bobRuntimeMessage =
      bobStatus.status === 'disabled'
        ? 'Runtime disabled by configuration'
        : bobStatus.message;

    return {
      public_demo_mode: this.env.public_demo_mode,
      allowed_repos: allowedRepoOptions(this.env),
      bob_shell_runtime: {
        available: bobStatus.available,
        required: true,
        status: bobStatus.status,
        message: bobRuntimeMessage,
        version: bobStatus.version,
        last_check_at: bobStatus.last_check_at
      },
      optional_llm: {
        available: optionalReady,
        provider: 'watsonx',
        model_id: optionalReady ? this.env.watsonx_model_id : null,
        features: {
          json_recovery: optionalReady && this.env.optional_llm_json_recovery,
          localization: optionalReady && this.env.optional_llm_localization
        }
      },
      limits: {
        max_concurrent_runs: this.env.max_concurrent_runs,
        max_runs_total: this.env.max_runs_total,
        max_runs_per_hour: this.env.max_runs_per_hour,
        max_evaluations_per_run: this.env.max_evaluations_per_run,
        max_localizations_per_run: this.env.max_localizations_per_run
      }
    };
  }
}
