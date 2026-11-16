# Design

## Current implementation

The current deployment is a start page, not a working country search.
`scripts/debounce.ts` is the only implemented search utility. It owns one timer
per wrapper and forwards the most recent arguments after a quiet period.
`tests/debounce.test.ts` uses fake timers without real waits or network calls.

The planned input delay is 300 ms: enough to combine a short typing burst while
keeping feedback reasonably quick. Without it every keystroke could create a
request. A much longer delay would make the interface feel unresponsive.
No search input is connected in this version.

## Planned cancellation and error handling

The DOM-independent search controller will abort the active request immediately
on every input change, before scheduling the next debounced request. Clearing
the input will also abort and clear the displayed results. Ignoring an old
result alone would leave an unnecessary request running.

The API wrapper will compose the input signal with a timeout signal. User
cancellation (`AbortError`) will be silent; `TimeoutError` will produce a retryable
error. HTTP 404 will return an empty array; other unsuccessful HTTP responses
will throw `HttpError`. These behaviours are planned and are not implemented.

## Complexity

Each debounce invocation performs O(1) timer operations and retains the latest
argument references. The mapping function is not implemented yet. Its planned
cost is O(L + C + B) for L languages, C currencies and B borders copied or mapped
into one card/detail model, with O(L + C + B) additional output space. Mapping
N countries costs O(N + sum(L + C + B)). No cache or deduplication is implemented.

## Clean code

- `debounce` has one responsibility and no DOM or network dependency.
- `scripts/main.ts` creates elements and writes text through DOM APIs.
- `tools/build.mjs` handles compilation and static file copying separately.
- Planned modules separate transport, mapping, request lifecycle and rendering;
  no extra Store/Repository hierarchy is needed for this exercise.
