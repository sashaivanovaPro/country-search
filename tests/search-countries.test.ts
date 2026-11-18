import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCountrySearch,
  searchCountries,
} from '../scripts/search-countries.js';
import { HttpError } from '../scripts/search-errors.js';
import { spainResponse } from './fixtures/countries.js';

describe('searchCountries', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('trims and encodes the query and maps returned countries', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([spainResponse])));
    const controller = new AbortController();
    const result = await searchCountries(' Côte d/Ivoire ', controller.signal);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://countries.dev/name/C%C3%B4te%20d%2FIvoire',
    );
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(result[0]).toMatchObject({
      name: 'Spain',
      capital: 'Madrid',
      flagEmoji: '🇪🇸',
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not request an empty query', async () => {
    expect(await searchCountries('  ', new AbortController().signal)).toEqual(
      [],
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('returns [] for a text/plain 404 without parsing JSON', async () => {
    fetchMock.mockResolvedValue(
      new Response('Country not found', { status: 404 }),
    );
    expect(
      await searchCountries('missing', new AbortController().signal),
    ).toEqual([]);
  });

  it.each([400, 429, 500, 503])(
    'throws HttpError for status %i before parsing its body',
    async (status) => {
      fetchMock.mockResolvedValue(new Response('Not JSON', { status }));
      const result = searchCountries('spain', new AbortController().signal);
      await expect(result).rejects.toBeInstanceOf(HttpError);
      await expect(result).rejects.toMatchObject({ status });
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('preserves network errors', async () => {
    const error = new TypeError('Offline');
    fetchMock.mockRejectedValue(error);
    await expect(
      searchCountries('spain', new AbortController().signal),
    ).rejects.toBe(error);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['invalid JSON', '{}', '[null]'])(
    'rejects malformed success data: %s',
    async (body) => {
      fetchMock.mockResolvedValue(new Response(body));
      await expect(
        searchCountries('spain', new AbortController().signal),
      ).rejects.toThrow();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('passes real external cancellation to the fetch signal', async () => {
    let combined: AbortSignal | undefined;
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          combined = init?.signal ?? undefined;
          combined?.addEventListener('abort', () => reject(combined?.reason), {
            once: true,
          });
        }),
    );
    const controller = new AbortController();
    const promise = searchCountries('spain', controller.signal);
    const rejected = expect(promise).rejects.toMatchObject({
      name: 'AbortError',
    });
    controller.abort();
    expect(combined?.aborted).toBe(true);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not fetch when its input signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      searchCountries('spain', controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts a stalled fetch with TimeoutError, not AbortError', async () => {
    const caller = new AbortController();
    let combined: AbortSignal | undefined;
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          combined = init?.signal ?? undefined;
          combined?.addEventListener('abort', () => reject(combined?.reason), {
            once: true,
          });
        }),
    );
    const promise = searchCountries('spain', caller.signal);
    const rejected = expect(promise).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    await vi.advanceTimersByTimeAsync(10000);
    await rejected;
    expect(combined?.aborted).toBe(true);
    expect(caller.signal.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the timeout active while reading the response body', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (_url, init) => {
        const body = new ReadableStream({
          start(stream) {
            init?.signal?.addEventListener(
              'abort',
              () => stream.error(init.signal?.reason),
              { once: true },
            );
          },
        });
        return new Response(body);
      });
    const search = createCountrySearch({ fetcher, timeoutMs: 50 });
    const promise = search('spain', new AbortController().signal);
    const rejected = expect(promise).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    await vi.advanceTimersByTimeAsync(50);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });
});
