import type { Country } from './country.js';
import { mapCountryResponse } from './map-country-response.js';
import { HttpError } from './search-errors.js';

interface CountrySearchOptions {
  readonly fetcher?: typeof fetch;
  readonly timeoutMs?: number;
}

export function createCountrySearch({
  fetcher,
  timeoutMs = 10000,
}: CountrySearchOptions = {}) {
  return async (query: string, signal: AbortSignal): Promise<Country[]> => {
    const normalized = query.trim();
    if (!normalized) return [];

    signal.throwIfAborted();
    const timeout = new AbortController();
    const timer = setTimeout(() => {
      timeout.abort(
        new DOMException('Country request timed out', 'TimeoutError'),
      );
    }, timeoutMs);
    const combined = AbortSignal.any([signal, timeout.signal]);

    try {
      const response = await (fetcher ?? fetch)(
        `https://countries.dev/name/${encodeURIComponent(normalized)}`,
        { signal: combined },
      );
      combined.throwIfAborted();
      if (response.status === 404) return [];
      if (!response.ok) throw new HttpError(response.status);
      const raw: unknown = await response.json();
      combined.throwIfAborted();
      if (!Array.isArray(raw)) throw new Error('Invalid country response');
      return raw.map(mapCountryResponse);
    } finally {
      clearTimeout(timer);
    }
  };
}

export const searchCountries = createCountrySearch();
