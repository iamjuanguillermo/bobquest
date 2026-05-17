import { finishRunPhase, startRunPhase, withRunStateUpdate } from '@bobquest/onboarding-contracts';
import type { WatsonxLocalizationLayer } from '@bobquest/optional-ibm-llm';
import { FileRunStateStore } from '@bobquest/runtime-state';
import type { RuntimeEnv } from '../env';
import { runtimeError } from '../security/errorResponse';
import { noopRuntimeLogger, runtimeLogFields, type RuntimeLogger } from '../observability/runtimeLogger';

export class LocalizationService {
  constructor(
    private readonly env: RuntimeEnv,
    private readonly stateStore: FileRunStateStore,
    private readonly localizationLayer: WatsonxLocalizationLayer | null = null,
    private readonly logger: RuntimeLogger = noopRuntimeLogger
  ) {}

  async localize(runId: string, language: string) {
    if (!this.env.optional_llm_enabled || !this.env.optional_llm_localization || !this.localizationLayer) {
      throw runtimeError('FEATURE_UNAVAILABLE', 'Localization is unavailable in this deployment.', 503);
    }
    const normalizedLanguage = language.trim().toLowerCase();
    const state = await this.stateStore.require(runId);
    if (state.state !== 'ready') throw runtimeError('RUN_NOT_READY', 'Localization requires a ready run.', 409);
    if (!state.analysis_original) throw runtimeError('RUN_NOT_READY', 'Localization requires original IBM Bob analysis.', 409);

    if (normalizedLanguage === 'en') {
      return this.stateStore.save(withRunStateUpdate(state, { active_language: 'en' }));
    }

    if (state.localized_analysis[normalizedLanguage]) {
      this.logger.info(runtimeLogFields({ event: 'localization_cache_hit', run_id: runId, phase: 'localization', language: normalizedLanguage }), 'BobQuest localization cache hit');
      return this.stateStore.save(withRunStateUpdate(state, { active_language: normalizedLanguage }));
    }

    if (state.usage.localizations_used >= this.env.max_localizations_per_run) throw runtimeError('LOCALIZATION_LIMIT_REACHED', 'Localization limit reached for this run.', 429);

    const localizing = startRunPhase(state, 'localization');
    await this.stateStore.save(localizing);
    this.logger.info(runtimeLogFields({ event: 'phase_started', run_id: runId, phase: 'localization', language: normalizedLanguage }), 'BobQuest localization started');

    try {
      const localized = await this.localizationLayer.localizeAnalysis(state.analysis_original, normalizedLanguage);
      const saved = finishRunPhase(
        withRunStateUpdate(localizing, {
          active_language: normalizedLanguage,
          localized_analysis: {
            ...state.localized_analysis,
            [normalizedLanguage]: localized
          },
          usage: { ...state.usage, localizations_used: state.usage.localizations_used + 1 }
        }),
        'localization',
        'completed'
      );
      this.logger.info(runtimeLogFields({ event: 'localization_completed', run_id: runId, phase: 'localization', language: normalizedLanguage }), 'BobQuest localization completed');
      return this.stateStore.save(saved);
    } catch (error) {
      const latest = await this.stateStore.require(runId);
      await this.stateStore.save(finishRunPhase(latest, 'localization', 'failed', error && typeof error === 'object' && 'code' in error ? String(error.code) : 'BOBQUEST_RUNTIME_ERROR'));
      throw error;
    }
  }
}
