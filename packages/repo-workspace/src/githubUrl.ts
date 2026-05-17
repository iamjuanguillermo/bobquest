export interface ValidatedGitHubRepo {
  owner: string;
  name: string;
  url: string;
  repo_id: string;
}

export class InvalidGitHubRepoError extends Error {
  override name = 'InvalidGitHubRepoError';
}

const ownerPattern = /^[A-Za-z0-9_.-]+$/;
const repoPattern = /^[A-Za-z0-9_.-]+$/;

export function normalizeGitHubRepoUrl(input: string): ValidatedGitHubRepo {
  const raw = input.trim();
  if (!raw) throw new InvalidGitHubRepoError('Repository URL is required.');
  if (/^(file|ssh|git|ftp|http):/i.test(raw) && !/^https:\/\/github\.com\//i.test(raw)) {
    throw new InvalidGitHubRepoError('Only HTTPS GitHub repository URLs are accepted.');
  }
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+/i.test(raw)) {
    throw new InvalidGitHubRepoError('Localhost and private network targets are rejected.');
  }

  let owner = '';
  let name = '';

  const shorthand = raw.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (shorthand) {
    owner = shorthand[1];
    name = shorthand[2];
  } else {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new InvalidGitHubRepoError('Repository must be owner/repo or https://github.com/owner/repo.');
    }
    if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'github.com') {
      throw new InvalidGitHubRepoError('Only https://github.com repositories are accepted.');
    }
    const parts = parsed.pathname.replace(/^\/+/, '').replace(/\.git$/, '').split('/').filter(Boolean);
    if (parts.length !== 2) throw new InvalidGitHubRepoError('Repository URL must point to exactly owner/repo.');
    [owner, name] = parts;
  }

  if (!ownerPattern.test(owner) || !repoPattern.test(name)) {
    throw new InvalidGitHubRepoError('Repository owner/name contains unsupported characters.');
  }

  const repo_id = `${owner}/${name}`;
  return {
    owner,
    name,
    repo_id,
    url: `https://github.com/${repo_id}`
  };
}

export function assertRepoAllowed(repo: ValidatedGitHubRepo, allowedRepoIds: string[]): void {
  const allowed = new Set(allowedRepoIds.map((item) => item.trim().toLowerCase()).filter(Boolean));
  if (!allowed.has(repo.repo_id.toLowerCase())) {
    throw new InvalidGitHubRepoError(`Repository ${repo.repo_id} is not approved for this public deployment.`);
  }
}
