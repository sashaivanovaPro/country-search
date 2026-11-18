import { describe, expect, it } from 'vitest';
import { mapCountryResponse } from '../scripts/map-country-response.js';
import { spainResponse } from './fixtures/countries.js';

describe('mapCountryResponse', () => {
  it('maps real API fields for cards and details', () => {
    expect(mapCountryResponse(spainResponse)).toEqual({
      id: 'ESP',
      name: 'Spain',
      capital: 'Madrid',
      region: 'Europe',
      population: 47351567,
      area: 505992,
      flagUrl: 'https://flagcdn.com/es.svg',
      flagEmoji: '🇪🇸',
      languages: ['Spanish'],
      currencies: ['Euro (EUR, €)'],
      borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
      description: 'Spain is in Europe. Its capital is Madrid.',
    });
  });

  it('keeps absent values distinct from valid zero values', () => {
    const country = mapCountryResponse({
      name: 'Island',
      population: 0,
      area: 0,
    });
    expect(country).toMatchObject({
      id: 'Island',
      name: 'Island',
      capital: null,
      region: null,
      population: 0,
      area: 0,
      flagUrl: null,
      flagEmoji: null,
      languages: [],
      currencies: [],
      borders: [],
      description: 'Island.',
    });
    expect(mapCountryResponse({ name: 'Unknown' }).population).toBeNull();
  });

  it('normalizes optional data and ignores invalid collection entries', () => {
    expect(
      mapCountryResponse({
        name: ' Island ',
        capital: '',
        region: null,
        population: -1,
        area: Infinity,
        languages: [null, { name: 'English' }, {}],
        currencies: [null, { name: 'Dollar' }, { code: 'XYZ' }],
        borders: [null, 'ABC', '', 2],
      }),
    ).toMatchObject({
      name: 'Island',
      capital: null,
      population: null,
      area: null,
      languages: ['English'],
      currencies: ['Dollar', 'XYZ'],
      borders: ['ABC'],
    });
  });

  it('handles empty and null arrays without crashing', () => {
    expect(
      mapCountryResponse({
        name: 'Island',
        languages: null,
        currencies: [],
        borders: null,
      }),
    ).toMatchObject({ languages: [], currencies: [], borders: [] });
  });

  it('prefers SVG, supports PNG and keeps an emoji out of img.src', () => {
    expect(
      mapCountryResponse({
        name: 'Island',
        flags: { png: 'https://example.com/f.png' },
      }).flagUrl,
    ).toBe('https://example.com/f.png');
    expect(
      mapCountryResponse({ name: 'Island', flag: '🇪🇸' }).flagUrl,
    ).toBeNull();
    expect(
      mapCountryResponse({ name: 'Island', flag: 'https://example.com/f.svg' })
        .flagUrl,
    ).toBe('https://example.com/f.svg');
    expect(
      mapCountryResponse({
        name: 'Island',
        flags: { svg: 'javascript:alert(1)' },
      }).flagUrl,
    ).toBeNull();
  });

  it('creates independent arrays and does not mutate its input', () => {
    const input = structuredClone(spainResponse);
    const first = mapCountryResponse(input);
    const second = mapCountryResponse(input);
    expect(first.borders).not.toBe(input.borders);
    expect(first.languages).not.toBe(second.languages);
    expect(input).toEqual(spainResponse);
  });

  it.each([null, [], 2, {}, { name: '' }])(
    'rejects malformed country data: %j',
    (raw) => {
      expect(() => mapCountryResponse(raw)).toThrow('Invalid country data');
    },
  );
});
