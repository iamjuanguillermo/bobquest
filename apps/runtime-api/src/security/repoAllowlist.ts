import { InvalidGitHubRepoError, assertRepoAllowed, normalizeGitHubRepoUrl, type ValidatedGitHubRepo } from '@bobquest/repo-workspace';
import type { RuntimeEnv } from '../env';
import { runtimeError } from './errorResponse';

export function resolveRequestedRepo(env: RuntimeEnv, input: { repo_url?: string; repo_id?: string }): ValidatedGitHubRepo {
  const target = env.public_demo_mode ? input.repo_id || input.repo_url || '' : input.repo_url || input.repo_id || '';
  try {
    const repo = normalizeGitHubRepoUrl(target);
    if (env.public_demo_mode) {
      try {
        assertRepoAllowed(repo, env.allowed_repos);
      } catch {
        throw runtimeError('REPO_NOT_ALLOWED', `Repository ${repo.repo_id} is not approved for this public deployment.`, 403);
      }
    }
    return repo;
  } catch (error) {
    if (error instanceof InvalidGitHubRepoError) throw runtimeError('INVALID_REPO', error.message, 400);
    throw error;
  }
}

export function allowedRepoOptions(env: RuntimeEnv) {
  return env.allowed_repos.map((repo) => ({ id: repo, label: repo, url: `https://github.com/${repo}` }));
}
