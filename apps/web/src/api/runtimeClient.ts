declare global {
  interface Window {
    __BOBQUEST_CONFIG__?: {
      runtimeApiUrl?: string;
    };
  }
}

const runtimeBaseUrl = String(
  window.__BOBQUEST_CONFIG__?.runtimeApiUrl || import.meta.env.VITE_BOBQUEST_RUNTIME_API_URL || 'http://localhost:8787'
).replace(/\/$/, '');

async function readJsonResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message ?? `Runtime request failed: ${response.status}`);
  return payload;
}

export async function getRuntimeCapabilities() {
  const response = await fetch(`${runtimeBaseUrl}/api/capabilities`);
  return readJsonResponse(response);
}

export async function createRuntimeRun(input: { repo_url?: string; repo_id?: string }) {
  const response = await fetch(`${runtimeBaseUrl}/api/runs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
  return readJsonResponse(response);
}

export async function getRuntimeRun(runId: string) {
  const response = await fetch(`${runtimeBaseUrl}/api/runs/${encodeURIComponent(runId)}`);
  return readJsonResponse(response);
}

export async function completeRuntimeObjective(runId: string, objectiveId: string, answer: unknown) {
  const response = await fetch(`${runtimeBaseUrl}/api/runs/${encodeURIComponent(runId)}/objectives/${encodeURIComponent(objectiveId)}/complete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ answer })
  });
  return readJsonResponse(response);
}

export async function evaluateRuntimeObjective(runId: string, objectiveId: string, input: { interaction_id: string; answer: string }) {
  const response = await fetch(`${runtimeBaseUrl}/api/runs/${encodeURIComponent(runId)}/objectives/${encodeURIComponent(objectiveId)}/evaluate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
  return readJsonResponse(response);
}

export async function localizeRuntimeRun(runId: string, language: string) {
  const response = await fetch(`${runtimeBaseUrl}/api/runs/${encodeURIComponent(runId)}/localize`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ language })
  });
  return readJsonResponse(response);
}
