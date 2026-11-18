export class HttpError extends Error {
  constructor(public readonly status: number) {
    super(`Country service returned HTTP ${status}. Please try again.`);
    this.name = 'HttpError';
  }
}

export interface SearchFailure {
  readonly kind: 'cancelled' | 'timeout' | 'http' | 'network' | 'unknown';
  readonly message: string;
}

export function classifySearchError(error: unknown): SearchFailure {
  const name =
    error !== null && typeof error === 'object' && 'name' in error
      ? error.name
      : undefined;
  if (name === 'AbortError') return { kind: 'cancelled', message: '' };
  if (name === 'TimeoutError') {
    return {
      kind: 'timeout',
      message: 'The request timed out. Please try again.',
    };
  }
  if (error instanceof HttpError)
    return { kind: 'http', message: error.message };
  if (error instanceof TypeError) {
    return {
      kind: 'network',
      message:
        'Cannot reach the country service. Check your connection and try again.',
    };
  }
  return {
    kind: 'unknown',
    message: 'Could not read the country data. Please try again.',
  };
}
