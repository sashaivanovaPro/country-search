const main = document.createElement('main');
main.className = 'page';

const title = document.createElement('h1');
title.textContent = 'Country Search';

const status = document.createElement('p');
status.className = 'status';
status.textContent = 'Work in progress · first submission';

const description = document.createElement('p');
description.textContent =
  'Country search is not connected yet. This deployment contains the project setup and a tested debounce utility.';

const heading = document.createElement('h2');
heading.textContent = 'Next steps';

const list = document.createElement('ul');
for (const text of [
  'Test and implement response mapping and API requests.',
  'Test cancellation, timeouts and retry behaviour.',
  'Connect search results and country details.',
]) {
  const item = document.createElement('li');
  item.textContent = text;
  list.append(item);
}

main.append(title, status, description, heading, list);
document.body.append(main);
