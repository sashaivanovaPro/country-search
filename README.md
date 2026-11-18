# Country Search

Live country search in TypeScript using [countries.dev](https://countries.dev).
Type a full or partial country name; select a result to view its area, borders,
languages and currencies. No API key is required.

- [Application](https://sashaivanovapro.github.io/country-search/)
- [Assignment](https://github.com/rolling-scopes-school/tasks/blob/master/fullstack-engineering/tasks/country-search/README.md)
- [Design decisions](DESIGN.md)

## Run locally

Use Node.js 22.14 or newer in the Node.js 22 release line and npm 10 or newer.

```sh
npm ci
npm run build
npm run preview
```

Open http://127.0.0.1:4173. After changing source files, build again and reload.
The build uses tsc and browser ES modules without an application bundler.

## Verify

```sh
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

Tests run in Node without a browser or real network. Fake timers and abort-aware
fetch mocks cover debounce, response mapping, HTTP statuses, cancellation,
timeouts, retry, cleanup and out-of-order responses. `npm run test:watch` starts
the watch runner; `npm run format` formats supported source files.

Pre-commit runs lint-staged only, so failing TDD tests can be committed.
Pre-push runs tests. Every required utility has separate test and implementation
commits; a separate race regression test follows the covered controller.

## Behaviour

- Searches start 300 ms after the last input change.
- Every change immediately aborts the previous active request.
- Empty input clears results and sends no request.
- HTTP 404 is an empty result. Other failures show an error and a retry button.
- A request, including its body, times out after 10 seconds.
- Retry immediately searches the latest query.
- Country details open in a native dialog, which supports Escape and keyboard focus.

There is no response cache, request deduplication or localStorage history.
The interface is in English. Browsers need AbortSignal.any and native dialog
support. The external API and flag image host must be reachable.

## Deployment

The GitHub Pages workflow runs on push to `country-search`. It installs locked
dependencies, runs tests and quality checks, compiles TypeScript, then publishes
only `build/` through official Pages actions. `build/` is not committed.
Keep Settings → Pages → Source set to GitHub Actions and permit `country-search`
in the `github-pages` deployment environment. The PR into `main` remains open.
