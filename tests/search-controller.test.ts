import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearchController } from '../scripts/search-controller.js';
import type { Country } from '../scripts/country.js';
import { mapCountryResponse } from '../scripts/map-country-response.js';
import { HttpError } from '../scripts/search-errors.js';
import { spainResponse, italyResponse } from './fixtures/countries.js';

const spain = mapCountryResponse(spainResponse);
const italy = mapCountryResponse(italyResponse);

function pendingSearch() {
  const requests: {
    query: string;
    signal: AbortSignal;
    resolve: (value: Country[]) => void;
  }[] = [];
  const search = vi.fn(
    (query: string, signal: AbortSignal) =>
      new Promise<Country[]>((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), {
          once: true,
        });
        requests.push({ query, signal, resolve });
      }),
  );
  return { search, requests };
}

describe('search controller', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('starts idle and never requests empty input', async () => {
    const search = vi.fn();
    const changed = vi.fn();
    const app = createSearchController(search, changed);
    expect(app.getState()).toMatchObject({
      status: 'idle',
      query: '',
      countries: [],
      error: null,
    });
    expect(changed).toHaveBeenCalledOnce();
    app.setQuery('   ');
    await vi.advanceTimersByTimeAsync(1000);
    expect(search).not.toHaveBeenCalled();
    app.dispose();
  });

  it('waits for the debounce and publishes loading followed by success', async () => {
    const { search, requests } = pendingSearch();
    const app = createSearchController(search, vi.fn());
    app.setQuery(' spain ');
    expect(app.getState()).toMatchObject({ status: 'waiting', query: 'spain' });
    await vi.advanceTimersByTimeAsync(299);
    expect(search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(app.getState().status).toBe('loading');
    requests[0]!.resolve([spain]);
    await vi.advanceTimersByTimeAsync(0);
    expect(app.getState()).toMatchObject({
      status: 'success',
      countries: [spain],
      error: null,
    });
    app.dispose();
  });

  it('aborts the old request immediately, before the next debounce runs', async () => {
    const { search, requests } = pendingSearch();
    const app = createSearchController(search, vi.fn());
    app.setQuery('sp');
    await vi.advanceTimersByTimeAsync(300);
    app.setQuery('spain');
    expect(requests[0]!.signal.aborted).toBe(true);
    expect(search).toHaveBeenCalledTimes(1);
    expect(app.getState()).toMatchObject({
      status: 'waiting',
      error: null,
      countries: [],
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(app.getState().status).toBe('waiting');
    app.dispose();
  });

  it('clears a pending debounce when input is emptied', async () => {
    const search = vi.fn();
    const app = createSearchController(search, vi.fn());
    app.setQuery('spain');
    app.setQuery('');
    await vi.advanceTimersByTimeAsync(1000);
    expect(search).not.toHaveBeenCalled();
    expect(app.getState()).toMatchObject({ status: 'idle', countries: [] });
    app.dispose();
  });

  it('aborts an active request and leaves a clear input idle', async () => {
    const { search, requests } = pendingSearch();
    const app = createSearchController(search, vi.fn());
    app.setQuery('spain');
    await vi.advanceTimersByTimeAsync(300);
    app.setQuery('');
    expect(requests[0]!.signal.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(app.getState()).toMatchObject({
      query: '',
      status: 'idle',
      countries: [],
      error: null,
    });
    app.dispose();
  });

  it('keeps a new request loading when the old cancellation is caught', async () => {
    const { search, requests } = pendingSearch();
    const app = createSearchController(search, vi.fn(), 0);
    app.setQuery('sp');
    await vi.advanceTimersByTimeAsync(0);
    app.setQuery('spain');
    app.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(requests[0]!.signal.aborted).toBe(true);
    expect(app.getState()).toMatchObject({
      query: 'spain',
      status: 'loading',
      error: null,
    });
    requests[1]!.resolve([spain]);
    await vi.advanceTimersByTimeAsync(0);
    expect(app.getState().countries).toEqual([spain]);
    app.dispose();
  });

  it('does not render a response from a dependency that ignores abort', async () => {
    let resolveOld: (value: Country[]) => void = () => {};
    const search = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Country[]>((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValueOnce([italy]);
    const app = createSearchController(search, vi.fn());
    app.setQuery('spain');
    await vi.advanceTimersByTimeAsync(300);
    app.setQuery('italy');
    await vi.advanceTimersByTimeAsync(300);
    resolveOld([spain]);
    await vi.advanceTimersByTimeAsync(0);
    expect(app.getState()).toMatchObject({
      query: 'italy',
      status: 'success',
      countries: [italy],
    });
    app.dispose();
  });

  it('does not revive a pending search after clear and retyping the same text', async () => {
    const search = vi.fn().mockResolvedValue([spain]);
    const app = createSearchController(search, vi.fn());
    app.setQuery('spain');
    await vi.advanceTimersByTimeAsync(200);
    app.setQuery('');
    app.setQuery('spain');
    await vi.advanceTimersByTimeAsync(299);
    expect(search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(search).toHaveBeenCalledTimes(1);
    app.dispose();
  });

  it('publishes empty for an empty array returned by the API', async () => {
    const app = createSearchController(vi.fn().mockResolvedValue([]), vi.fn());
    app.setQuery('missing');
    await vi.advanceTimersByTimeAsync(300);
    expect(app.getState()).toMatchObject({
      status: 'empty',
      countries: [],
      error: null,
    });
    app.dispose();
  });

  it.each([
    new DOMException('Timed out', 'TimeoutError'),
    new HttpError(500),
    new TypeError('Offline'),
    new Error('Invalid data'),
  ])('publishes retryable error state for %j', async (error) => {
    const app = createSearchController(
      vi.fn().mockRejectedValue(error),
      vi.fn(),
    );
    app.setQuery('spain');
    await vi.advanceTimersByTimeAsync(300);
    expect(app.getState().status).toBe('error');
    expect(app.getState().error).not.toBeNull();
    app.dispose();
  });

  it('never presents AbortError as a user-facing failure', async () => {
    const app = createSearchController(
      vi.fn().mockRejectedValue(new DOMException('Canceled', 'AbortError')),
      vi.fn(),
    );
    app.setQuery('spain');
    await vi.advanceTimersByTimeAsync(300);
    expect(app.getState()).toMatchObject({ status: 'idle', error: null });
    app.dispose();
  });

  it('retries the latest query immediately and cancels its pending debounce', async () => {
    const search = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Offline'))
      .mockResolvedValue([italy]);
    const app = createSearchController(search, vi.fn());
    app.setQuery('spain');
    await vi.advanceTimersByTimeAsync(300);
    app.setQuery('italy');
    app.retry();
    expect(search.mock.calls[1]?.[0]).toBe('italy');
    await vi.advanceTimersByTimeAsync(1000);
    expect(search).toHaveBeenCalledTimes(2);
    expect(app.getState()).toMatchObject({
      status: 'success',
      countries: [italy],
    });
    app.dispose();
  });

  it('does not retry an empty query', () => {
    const search = vi.fn();
    const app = createSearchController(search, vi.fn());
    app.retry();
    expect(search).not.toHaveBeenCalled();
    app.dispose();
  });

  it('disposes an active request without notifying the view again', async () => {
    const { search, requests } = pendingSearch();
    const changed = vi.fn();
    const app = createSearchController(search, changed);
    app.setQuery('spain');
    await vi.advanceTimersByTimeAsync(300);
    const count = changed.mock.calls.length;
    app.dispose();
    app.setQuery('italy');
    app.retry();
    app.dispose();
    await vi.advanceTimersByTimeAsync(1000);
    expect(requests[0]!.signal.aborted).toBe(true);
    expect(changed).toHaveBeenCalledTimes(count);
    expect(search).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('disposes a pending debounce', async () => {
    const search = vi.fn();
    const app = createSearchController(search, vi.fn());
    app.setQuery('spain');
    app.dispose();
    await vi.advanceTimersByTimeAsync(1000);
    expect(search).not.toHaveBeenCalled();
  });
});
