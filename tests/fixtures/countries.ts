export const spainResponse = {
  name: 'Spain',
  alpha3Code: 'ESP',
  capital: 'Madrid',
  region: 'Europe',
  population: 47351567,
  area: 505992,
  flag: '🇪🇸',
  flags: {
    svg: 'https://flagcdn.com/es.svg',
    png: 'https://flagcdn.com/w320/es.png',
  },
  languages: [{ name: 'Spanish' }],
  currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
  borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
};

export const italyResponse = {
  ...spainResponse,
  name: 'Italy',
  alpha3Code: 'ITA',
  capital: 'Rome',
  flag: '🇮🇹',
  flags: { svg: 'https://flagcdn.com/it.svg' },
};
