import type { Country } from './country.js';
import { debounce } from './debounce.js';
import { classifySearchError } from './search-errors.js';

export interface SearchState {
  readonly query: string;
  readonly status:
    | 'idle'
    | 'waiting'
    | 'loading'
    | 'success'
    | 'empty'
    | 'error';
  readonly countries: readonly Country[];
  readonly error: string | null;
}

export interface SearchController {
  getState(): SearchState;
  setQuery(query: string): void;
  retry(): void;
  dispose(): void;
}

type Search = (query: string, signal: AbortSignal) => Promise<Country[]>;

export function createSearchController(
  search: Search,
  onChange: (state: SearchState) => void,
  delay = 300,
): SearchController {
  let state: SearchState = {
    query: '',
    status: 'idle',
    countries: [],
    error: null,
  };
  let active: AbortController | null = null;
  let disposed = false;

  const publish = (
    status: SearchState['status'],
    countries: readonly Country[] = [],
    error: string | null = null,
  ): void => {
    state = { query: state.query, status, countries, error };
    onChange(state);
  };

  const execute = async (query: string): Promise<void> => {
    const request = new AbortController();
    active = request;
    publish('loading');
    try {
      const countries = await search(query, request.signal);
      if (disposed || active !== request || request.signal.aborted) return;
      publish(countries.length ? 'success' : 'empty', countries);
    } catch (error) {
      if (disposed || active !== request) return;
      const failure = classifySearchError(error);
      if (failure.kind === 'cancelled') publish('idle');
      else publish('error', [], failure.message);
    } finally {
      if (active === request) active = null;
    }
  };

  const scheduled = debounce((query: string) => {
    void execute(query);
  }, delay);
  const stop = (): void => {
    scheduled.cancel();
    const previous = active;
    active = null;
    previous?.abort();
  };

  onChange(state);

  return {
    getState: () => state,
    setQuery(value) {
      if (disposed) return;
      stop();
      const query = value.trim();
      state = { ...state, query };
      publish(query ? 'waiting' : 'idle');
      if (query) scheduled(query);
    },
    retry() {
      if (disposed || !state.query) return;
      stop();
      void execute(state.query);
    },
    dispose() {
      disposed = true;
      stop();
    },
  };
}
