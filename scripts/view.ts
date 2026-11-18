import type { Country } from './country.js';
import type { SearchState } from './search-controller.js';

interface ViewActions {
  onQuery(query: string): void;
  onRetry(): void;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const numbers = new Intl.NumberFormat('en');
const displayNumber = (value: number | null): string =>
  value === null ? 'Not available' : numbers.format(value);
const displayList = (values: readonly string[], fallback: string): string =>
  values.length ? values.join(', ') : fallback;

function flag(country: Country): HTMLElement {
  const fallback = element(
    'span',
    'flag flag--emoji',
    country.flagEmoji ?? '🌐',
  );
  fallback.setAttribute('role', 'img');
  fallback.setAttribute('aria-label', `Flag of ${country.name}`);
  if (!country.flagUrl) return fallback;

  const image = element('img', 'flag');
  image.src = country.flagUrl;
  image.alt = `Flag of ${country.name}`;
  image.width = 160;
  image.height = 100;
  image.loading = 'lazy';
  image.addEventListener('error', () => image.replaceWith(fallback), {
    once: true,
  });
  return image;
}

export function createSearchView(actions: ViewActions) {
  const main = element('main', 'page');
  const header = element('header', 'page-header');
  header.append(
    element('p', 'eyebrow', 'A world of possibilities'),
    element('h1', 'page-title', 'Country Search'),
    element(
      'p',
      'intro',
      'Find a country. Get to know a little more of the world.',
    ),
  );

  const form = element('form', 'search');
  form.method = 'get';
  const label = element('label', 'search-label', 'Search countries');
  label.htmlFor = 'country-query';
  const controls = element('div', 'search-controls');
  const input = element('input', 'search-input');
  input.type = 'search';
  input.id = 'country-query';
  input.name = 'query';
  input.placeholder = 'Try Spain, Japan or Canada';
  input.autocomplete = 'off';
  input.setAttribute('aria-describedby', 'search-help');
  const clear = element('button', 'button button--subtle', 'Clear');
  clear.type = 'button';
  controls.append(input, clear);
  const help = element(
    'p',
    'search-help',
    'Results appear as you type. Select a country to explore its details.',
  );
  help.id = 'search-help';
  form.append(label, controls, help);

  const status = element('p', 'status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  const errorPanel = element('div', 'error-panel');
  errorPanel.hidden = true;
  const errorMessage = element('p', 'error-message');
  errorMessage.setAttribute('role', 'alert');
  const retry = element('button', 'button', 'Retry search');
  retry.type = 'button';
  errorPanel.append(errorMessage, retry);

  const results = element('ul', 'country-list');
  results.setAttribute('aria-label', 'Country search results');
  const dialog = element('dialog', 'details');
  dialog.setAttribute('aria-labelledby', 'country-details-title');

  const showDetails = (country: Country): void => {
    const close = element(
      'button',
      'button button--subtle details-close',
      'Close details',
    );
    close.type = 'button';
    close.addEventListener('click', () => dialog.close());
    const title = element('h2', 'details-title', country.name);
    title.id = 'country-details-title';
    const data = element('dl', 'details-data');
    const fields: [string, string][] = [
      ['Capital', country.capital ?? 'Not available'],
      ['Region', country.region ?? 'Not available'],
      ['Population', displayNumber(country.population)],
      [
        'Area',
        country.area === null
          ? 'Not available'
          : `${displayNumber(country.area)} km²`,
      ],
      ['Languages', displayList(country.languages, 'Not available')],
      ['Currency', displayList(country.currencies, 'Not available')],
      [
        'Borders (ISO codes)',
        displayList(country.borders, 'No land borders listed'),
      ],
    ];
    for (const [label, value] of fields) {
      data.append(
        element('dt', 'details-term', label),
        element('dd', 'details-value', value),
      );
    }
    dialog.replaceChildren(
      close,
      title,
      flag(country),
      element('p', 'details-description', country.description),
      data,
    );
    dialog.showModal();
  };

  input.addEventListener('input', () => actions.onQuery(input.value));
  clear.addEventListener('click', () => {
    input.value = '';
    actions.onQuery('');
    input.focus();
  });
  retry.addEventListener('click', () => actions.onRetry());
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    actions.onRetry();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  main.append(
    header,
    form,
    status,
    errorPanel,
    results,
    element('p', 'attribution', 'Country data from countries.dev'),
    dialog,
  );

  return {
    element: main,
    render(state: SearchState): void {
      if (dialog.open) dialog.close();
      const messages: Record<SearchState['status'], string> = {
        idle: 'Enter a country name to start exploring.',
        waiting: 'Waiting for you to finish typing…',
        loading: `Searching for “${state.query}”…`,
        success: `${state.countries.length} ${state.countries.length === 1 ? 'country' : 'countries'} found`,
        empty: `No countries found for “${state.query}”. Try another name.`,
        error: 'Search could not be completed.',
      };
      status.textContent = messages[state.status];
      status.dataset.state = state.status;
      results.setAttribute('aria-busy', String(state.status === 'loading'));
      errorPanel.hidden = state.status !== 'error';
      errorMessage.textContent = state.error ?? '';
      clear.disabled = !input.value;
      results.replaceChildren(
        ...state.countries.map((country) => {
          const item = element('li', 'country-item');
          const card = element('button', 'country-card');
          card.type = 'button';
          card.setAttribute('aria-label', `View details for ${country.name}`);
          card.append(
            flag(country),
            element('span', 'country-name', country.name),
            element(
              'span',
              'country-fact',
              `Capital: ${country.capital ?? 'Not available'}`,
            ),
            element(
              'span',
              'country-fact',
              `Region: ${country.region ?? 'Not available'}`,
            ),
            element(
              'span',
              'country-fact',
              `Population: ${displayNumber(country.population)}`,
            ),
            element('span', 'country-link', 'Explore country →'),
          );
          card.addEventListener('click', () => showDetails(country));
          item.append(card);
          return item;
        }),
      );
    },
  };
}
