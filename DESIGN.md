# Country Search design

## Boundaries

- `country.ts` describes the readonly data model consumed by the interface.
- `map-country-response.ts` accepts unknown JSON, validates the required name,
  normalizes optional fields and returns fresh arrays without DOM or network access.
- `search-errors.ts` preserves HTTP status and classifies cancellation, timeout,
  HTTP, network and unexpected failures.
- `search-countries.ts` owns fetch, status checks and request timeout.
- `search-controller.ts` owns state and request lifecycle. The search function and
  state callback are parameters, so it needs neither fetch nor a browser to test.
- `view.ts` creates DOM elements, renders state and owns country details.
- `main.ts` connects the modules. There is one API source; separate Store,
  Repository and Gateway classes would add no useful behaviour here.

## Debounce and immediate cancellation

The controller handles every input change synchronously: cancel the pending
debounce, clear the active request reference, call abort on the previous
controller, clear its results, then schedule the new normalized query.
Empty input stops there and stays idle. The next request starts only after the
300 ms quiet period.

Aborting only when the next debounce fires would leave a window in which an old
response could be displayed beneath new input. Ignoring old responses alone
would also leave their network work running. The implementation really aborts
the request, including response body consumption.

The catch and finally paths also check request identity. An old cancellation
must not erase a newer request's loading or error state. This identity check
supplements network cancellation; it does not replace it.

Three hundred milliseconds combines normal typing bursts while keeping feedback
quick. Removing the delay would start a request per input event; a much longer
delay would make the interface feel slow. The debounce wrapper owns one timer
and exposes cancel for clearing input, retry and disposal. Retry removes pending
work and starts the latest query immediately, avoiding a second delayed request.

## Timeout, HTTP and errors

`createCountrySearch` defaults to a 10-second timeout. A timer aborts a dedicated
timeout controller with a DOMException named TimeoutError. AbortSignal.any joins
that signal with the caller's signal. The timer is always cleared in finally,
including after success, HTTP errors or user cancellation. This manual timeout
source also allows deterministic fake-timer tests. The caller's controller is
never aborted by the timeout source.

The timeout covers both fetch and response.json. A pre-aborted caller signal
fails before fetch. HTTP 404 returns an empty array before JSON parsing: this
endpoint can return a plain-text 404 body. Every other unsuccessful status throws
HttpError with its status. Invalid successful JSON remains an error.

The controller treats AbortError as silent, TimeoutError as retryable, and shows
HTTP/network/unexpected failures with a retry action. It never exposes raw server
HTML or exception text to the interface.

## API mapping and details

The name endpoint returns an array. The actual response uses string name/capital
and arrays of language/currency objects. The flag field can be an emoji; image
URLs come from flags.svg or flags.png. The mapper also accepts an HTTPS flag URL
for compatibility, but never uses an emoji as img.src.

Absent numeric data is null, not zero. Zero remains a valid displayed value.
Details use fields already returned by the search; borders are labelled as ISO
codes. The description is a short sentence formed from name, region and capital,
not a separate editorial description supplied by the API. No second detail
request is necessary.

## Complexity

For one country, let L be the number of languages, C currencies, B borders and S
the total length of text read or constructed. Mapping takes O(L + C + B + S)
time and output space. It creates new arrays and does not mutate raw JSON.
For N countries the cost is O(N + sum(L + C + B + S)).

Debounce uses O(1) timer operations and one retained argument list. The controller
keeps one pending debounce and one current request; result storage is O(N) model
references, in addition to the models themselves. View rendering is linear in
the displayed result data. There is no cache, deduplication or search history.

## Clean-code examples

- Single responsibility: mapCountryResponse transforms data; createCountrySearch
  transports it; createSearchController coordinates requests; createSearchView
  handles DOM and interaction.
- Dependency injection: createSearchController receives its search function and
  onChange callback. createCountrySearch accepts an optional fetcher and timeout.
- Explicit boundaries: JSON is unknown until mapping; Country and SearchState
  expose readonly fields. No singleton or DOM reference is used by core logic.
- Resource cleanup: debounce.cancel clears pending work; controller.dispose
  cancels the active request; the API clears its timeout in finally.
- Safe rendering: view uses createElement, textContent and replaceChildren.
  User input and external names are rendered as text. Native dialog supplies
  keyboard focus handling and Escape; flags include dimensions and fallback text.

## Verification

Each required function has tests committed before its implementation. The race
test is a separate commit after the covered controller. Its fetch mock listens
to abort and rejects the old promise with AbortError. Old server delivery is
scheduled later than the new response; it cannot fulfill an already aborted
promise or overwrite the latest state.

All logic tests run without DOM or live network. They use local fixtures,
controlled promises and fake timers. Browser checks of the public deployment,
including real canceled requests in Network, remain part of the PR checklist.

References: [name endpoint](https://countries.dev/docs/api/name),
[AbortSignal.any](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static).
