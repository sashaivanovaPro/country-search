import { searchCountries } from './search-countries.js';
import { createSearchController } from './search-controller.js';
import { createSearchView } from './view.js';

const view = createSearchView({
  onQuery: (query) => controller.setQuery(query),
  onRetry: () => controller.retry(),
});
const controller = createSearchController(searchCountries, view.render);
document.body.append(view.element);

window.addEventListener('pagehide', (event) => {
  if (!event.persisted) controller.dispose();
});
