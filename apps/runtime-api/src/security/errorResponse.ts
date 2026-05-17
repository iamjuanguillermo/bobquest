export type RuntimeApiErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_REQUEST_BODY'
  | 'INVALID_REPO'
  | 'REPO_NOT_ALLOWED'
  | 'RUN_NOT_FOUND'
  | 'RUN_NOT_READY'
  | 'RUN_LIMIT_REACHED'
  | 'EVALUATION_LIMIT_REACHED'
  | 'LOCALIZATION_LIMIT_REACHED'
  | 'BOB_UNAVAILABLE'
  | 'BOB_NOT_CONFIGURED'
  | 'BOB_BINARY_NOT_FOUND'
  | 'BOB_PREFLIGHT_FAILED'
  | 'INVALID_BOB_JSON'
  | 'BOB_PROCESS_CANCELLED'
  | 'FEATURE_UNAVAILABLE'
  | 'RUNTIME_DISABLED'
  | 'WORKSPACE_UNAVAILABLE'
  | 'BOBQUEST_RUNTIME_ERROR';

export class RuntimeApiError extends Error {
  readonly code: RuntimeApiErrorCode;
  readonly statusCode: number;

  constructor(code: RuntimeApiErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = 'RuntimeApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function runtimeError(code: RuntimeApiErrorCode, message: string, statusCode = 400): RuntimeApiError {
  return new RuntimeApiError(code, message, statusCode);
}

export function normalizeRuntimeError(error: unknown): RuntimeApiError {
  if (error instanceof RuntimeApiError) return error;

  if (error && typeof error === 'object') {
    const maybe = error as { code?: unknown; message?: unknown; validation?: unknown; statusCode?: unknown; name?: unknown };
    if (maybe.validation) {
      return new RuntimeApiError('INVALID_REQUEST_BODY', 'Request payload does not match the BobQuest runtime API schema.', 400);
    }
    if (maybe.code === 'FST_ERR_CTP_INVALID_JSON_BODY') {
      return new RuntimeApiError('INVALID_REQUEST_BODY', 'Request body must be valid JSON.', 400);
    }
    if (maybe.code === 'RUN_NOT_FOUND') {
      return new RuntimeApiError('RUN_NOT_FOUND', String(maybe.message || 'Run state not found.'), 404);
    }
    if (maybe.name === 'BobShellUnavailableError') {
      return new RuntimeApiError('BOB_UNAVAILABLE', String(maybe.message || 'IBM Bob Shell is unavailable.'), 503);
    }
    if (maybe.name === 'BobShellNotConfiguredError') {
      return new RuntimeApiError('BOB_NOT_CONFIGURED', String(maybe.message || 'IBM Bob Shell is not configured.'), 503);
    }
    if (maybe.name === 'BobShellBinaryNotFoundError') {
      return new RuntimeApiError('BOB_BINARY_NOT_FOUND', String(maybe.message || 'IBM Bob Shell binary not found.'), 503);
    }
    if (maybe.name === 'BobShellPreflightFailedError') {
      return new RuntimeApiError('BOB_PREFLIGHT_FAILED', String(maybe.message || 'IBM Bob Shell preflight failed.'), 503);
    }
    if (maybe.name === 'BobJsonExtractionError') {
      return new RuntimeApiError('INVALID_BOB_JSON', String(maybe.message || 'IBM Bob Shell returned invalid JSON.'), 502);
    }
  }

  const message = error instanceof Error ? error.message : 'Unexpected runtime error.';
  return new RuntimeApiError('BOBQUEST_RUNTIME_ERROR', message, 500);
}

export function publicError(error: unknown): { statusCode: number; body: { error: { code: RuntimeApiErrorCode; message: string } } } {
  const normalized = normalizeRuntimeError(error);
  return {
    statusCode: normalized.statusCode,
    body: {
      error: {
        code: normalized.code,
        message: normalized.message
      }
    }
  };
}
