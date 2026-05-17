export type BobShellStatus =
  | 'ready'
  | 'not_configured'
  | 'binary_not_found'
  | 'preflight_failed'
  | 'auth_invalid'
  | 'disabled'
  | 'unknown';

export interface BobShellStatusResult {
  available: boolean;
  status: BobShellStatus;
  message: string;
  version?: string;
  command_path?: string;
  preflight_duration_ms?: number;
  last_check_at?: string;
}

// Made with Bob
