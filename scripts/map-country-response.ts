import type { Country } from './country.js';

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function imageUrl(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function items(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function mapCountryResponse(raw: unknown): Country {
  const data = record(raw);
  const name = text(data?.name);
  if (!data || !name) throw new Error('Invalid country data');

  const flags = record(data.flags);
  const capital = text(data.capital);
  const region = text(data.region);
  const flag = text(data.flag);

  return {
    id: text(data.alpha3Code) ?? name,
    name,
    flagUrl: imageUrl(flags?.svg) ?? imageUrl(flags?.png) ?? imageUrl(flag),
    flagEmoji: flag && !flag.includes('://') ? flag : null,
    capital,
    region,
    population: number(data.population),
    area: number(data.area),
    languages: items(data.languages).flatMap((item) => {
      const name = text(record(item)?.name);
      return name ? [name] : [];
    }),
    currencies: items(data.currencies).flatMap((item) => {
      const currency = record(item);
      const name = text(currency?.name) ?? text(currency?.code);
      if (!name) return [];
      const details = [text(currency?.code), text(currency?.symbol)].filter(
        (value) => value && value !== name,
      );
      return [details.length ? `${name} (${details.join(', ')})` : name];
    }),
    borders: items(data.borders).flatMap((item) =>
      text(item) ? [text(item)!] : [],
    ),
    description: `${name}${region ? ` is in ${region}` : ''}.${capital ? ` Its capital is ${capital}.` : ''}`,
  };
}
