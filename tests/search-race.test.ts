import { afterEach, expect, it, vi } from 'vitest';
import { createCountrySearch } from '../scripts/search-countries.js';
import { createSearchController } from '../scripts/search-controller.js';
import { spainResponse, italyResponse } from './fixtures/countries.js';

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

it('aborts the slow old fetch and retains only the faster latest response', async () => {
  vi.useFakeTimers();
  const attempts: string[] = [];
  const accepted: string[] = [];
  const aborted: string[] = [];
  const signals: AbortSignal[] = [];

  const fetcher = vi.fn<typeof fetch>(
    (input, init) =>
      new Promise((resolve, reject) => {
        const query = String(input).split('/').at(-1)!;
        const signal = init?.signal;
        if (!signal) throw new Error('fetch requires an AbortSignal');
        signals.push(signal);
        let canceled = false;
        const abort = (): void => {
          canceled = true;
          aborted.push(query);
          reject(signal.reason);
        };
        if (signal.aborted) abort();
        else signal.addEventListener('abort', abort, { once: true });

        // The old server response is scheduled after the new one. Once aborted,
        // its promise must stay rejected even when that delivery time arrives.
        setTimeout(
          () => {
            signal.removeEventListener('abort', abort);
            attempts.push(query);
            if (canceled) return;
            accepted.push(query);
            resolve(
              new Response(
                JSON.stringify([
                  query === 'sp' ? spainResponse : italyResponse,
                ]),
              ),
            );
          },
          query === 'sp' ? 1000 : 50,
        );
      }),
  );

  const changed = vi.fn();
  const app = createSearchController(createCountrySearch({ fetcher }), changed);
  app.setQuery('sp');
  await vi.advanceTimersByTimeAsync(300);
  app.setQuery('italy');
  expect(signals[0]?.aborted).toBe(true);
  expect(aborted).toEqual(['sp']);
  await vi.advanceTimersByTimeAsync(350);
  expect(app.getState()).toMatchObject({ query: 'italy', status: 'success' });
  expect(app.getState().countries.map((country) => country.name)).toEqual([
    'Italy',
  ]);
  await vi.advanceTimersByTimeAsync(1000);
  expect(attempts).toEqual(['italy', 'sp']);
  expect(accepted).toEqual(['italy']);
  expect(app.getState().countries.map((country) => country.name)).toEqual([
    'Italy',
  ]);
  expect(changed.mock.calls.some(([state]) => state.status === 'error')).toBe(
    false,
  );
  app.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
