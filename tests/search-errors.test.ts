import { describe, expect, it } from 'vitest';
import { classifySearchError, HttpError } from '../scripts/search-errors.js';

describe('search failures', () => {
  it('preserves the HTTP status in an Error subclass', () => {
    const error = new HttpError(503);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('HttpError');
    expect(error.status).toBe(503);
    expect(classifySearchError(error)).toMatchObject({ kind: 'http' });
    expect(classifySearchError(error).message).toContain('503');
  });
  it('treats user cancellation as silent', () => {
    expect(
      classifySearchError(new DOMException('Canceled', 'AbortError')),
    ).toEqual({ kind: 'cancelled', message: '' });
  });
  it('recognizes error names without relying on a single realm', () => {
    expect(classifySearchError({ name: 'AbortError' }).kind).toBe('cancelled');
    expect(classifySearchError({ name: 'TimeoutError' }).kind).toBe('timeout');
  });
  it('shows timeout as a retryable failure', () => {
    const failure = classifySearchError(
      new DOMException('Timed out', 'TimeoutError'),
    );
    expect(failure.kind).toBe('timeout');
    expect(failure.message).toContain('timed out');
  });
  it('recognizes a failed fetch', () => {
    expect(classifySearchError(new TypeError('Failed to fetch')).kind).toBe(
      'network',
    );
  });
  it.each([new Error('Bad JSON'), null, 'unexpected'])(
    'provides a fallback for %j',
    (error) => {
      expect(classifySearchError(error).kind).toBe('unknown');
      expect(classifySearchError(error).message).not.toBe('');
    },
  );
});
