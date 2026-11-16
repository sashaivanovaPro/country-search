# Country Search

Work in progress: project tooling, a tested debounce utility and a deployment
start page. Country search, API requests and country details are not implemented.

## Run locally

Use Node.js 22.14 or newer in the Node.js 22 release line, and npm 10 or newer.

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
npm run preview
```

Open http://127.0.0.1:4173. Upload the contents of `build/` to static hosting.
The build uses `tsc` and ES modules, without an application bundler.

## TDD

`debounce`: failing tests in a separate commit, followed by implementation.
Pre-commit checks staged files only. Pre-push runs tests.

Remaining TDD pairs: `mapCountryResponse`, `searchCountries`, and error handling.
An abort-aware race regression test must follow the covered base logic.

See [DESIGN.md](DESIGN.md) for implemented and planned decisions.
