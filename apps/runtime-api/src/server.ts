import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BobShellAdapter } from '@bobquest/bob-shell-runtime';
import { cleanupExpiredWorkspaces } from '@bobquest/repo-workspace';
import { FileRunStateStore } from '@bobquest/runtime-state';
import { WatsonxClient, WatsonxJsonRecoveryAssistant, WatsonxLocalizationLayer } from '@bobquest/optional-ibm-llm';
import { loadRuntimeEnv, type RuntimeEnv } from './env';
import { publicError } from './security/errorResponse';
import { PersistentRuntimeLimitStore } from './security/limits';
import { CapabilityService } from './services/CapabilityService';
import { RunService } from './services/RunService';
import { EvaluationService } from './services/EvaluationService';
import { LocalizationService } from './services/LocalizationService';
import { BobProcessRegistry } from './services/BobProcessRegistry';
import { healthRoutes } from './routes/health';
import { capabilityRoutes } from './routes/capabilities';
import { bobRoutes } from './routes/bob';
import { runRoutes } from './routes/runs';
import { objectiveRoutes } from './routes/objectives';
import { localizationRoutes } from './routes/localization';

function findProjectRoot(startDir: string): string {
  let current = resolve(startDir);
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(resolve(current, 'prompts', 'bob-shell', 'analyze_repo.md'))) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return resolve(startDir);
}


function registerJsonBodyParser(app: FastifyInstance) {
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
    const raw = typeof body === 'string' ? body.trim() : '';
    if (!raw) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(raw));
    } catch (error) {
      done(error as Error, undefined);
    }
  });
}

function absolutizeRuntimeDirs(env: RuntimeEnv, projectRoot: string): RuntimeEnv {
  return {
    ...env,
    runtime_data_dir: isAbsolute(env.runtime_data_dir) ? env.runtime_data_dir : resolve(projectRoot, env.runtime_data_dir),
    workspace_dir: isAbsolute(env.workspace_dir) ? env.workspace_dir : resolve(projectRoot, env.workspace_dir)
  };
}

export async function buildServer() {
  const projectRoot = findProjectRoot(process.env.BOBQUEST_PROJECT_ROOT || process.cwd());
  const env = absolutizeRuntimeDirs(loadRuntimeEnv(), projectRoot);
  const app = Fastify({ logger: true });
  registerJsonBodyParser(app);
  cleanupExpiredWorkspaces(env.workspace_dir, env.workspace_ttl_ms).catch((error) => {
    app.log.warn({ error }, 'workspace TTL cleanup failed');
  });

  await app.register(cors, { origin: true });

  const bobShell = new BobShellAdapter({
    command: env.bobshell_command,
    args: env.bobshell_args,
    analyze_args: env.bobshell_analyze_args,
    evaluate_args: env.bobshell_evaluate_args,
    prompt_mode: env.bobshell_prompt_mode,
    prompt_arg: env.bobshell_prompt_arg,
    timeout_ms: env.bobshell_timeout_ms,
    status_args: env.bobshell_status_args,
    status_timeout_ms: env.bobshell_status_timeout_ms,
    cache_ttl_ms: env.bobshell_preflight_cache_ttl_ms,
    runtime_disabled: env.runtime_disabled
  });
  const stateStore = new FileRunStateStore(env.runtime_data_dir);
  const limitStore = new PersistentRuntimeLimitStore(resolve(env.runtime_data_dir, '_runtime_limits.json'));
  await limitStore.initializeForBoot();
  const processRegistry = new BobProcessRegistry();
  const watsonxClient = new WatsonxClient({
    enabled: env.optional_llm_enabled,
    provider: 'watsonx',
    api_key: env.watsonx_api_key,
    project_id: env.watsonx_project_id,
    url: env.watsonx_url,
    model_id: env.watsonx_model_id || 'ibm/granite-3-2b-instruct',
    max_output_tokens: env.watsonx_max_output_tokens,
    temperature: env.watsonx_temperature,
    top_p: env.watsonx_top_p,
    timeout_ms: env.optional_llm_timeout_ms,
    max_retries: env.optional_llm_max_retries
  });
  const jsonRecoveryAssistant = new WatsonxJsonRecoveryAssistant(watsonxClient);
  const localizationLayer = new WatsonxLocalizationLayer(watsonxClient);
  const capabilityService = new CapabilityService(env, bobShell, watsonxClient);
  const runService = new RunService(env, bobShell, stateStore, limitStore, projectRoot, jsonRecoveryAssistant, processRegistry, app.log);
  const evaluationService = new EvaluationService(env, bobShell, stateStore, projectRoot, processRegistry, app.log);
  const localizationService = new LocalizationService(env, stateStore, localizationLayer, app.log);

  await healthRoutes(app);
  await capabilityRoutes(app, capabilityService);
  await bobRoutes(app, env, bobShell);
  await runRoutes(app, runService);
  await objectiveRoutes(app, evaluationService);
  await localizationRoutes(app, localizationService);

  app.setErrorHandler((error, _request, reply) => {
    const normalized = publicError(error);
    reply.code(normalized.statusCode).send(normalized.body);
  });

  return { app, env };
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  const { app, env } = await buildServer();
  await app.listen({ port: env.port, host: env.host });
}
