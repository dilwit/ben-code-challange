# 02: Feature: Generate Commission Quote

See [01: Project Structure and Tech Stack](01-project-structure-and-tech-stack.md) for the overall structure this feature sits in.

## 1. Overview

**As a** user, **I want to** enter a loan's amount, term and risk band **so that** I get a commission quote from the Commission Quote API.

- The user fills in three required fields and clicks **Generate**.
- The app sends the data to its own app route. The app route calls the third-party Commission Quote API.
- The quote is shown as a quote ID, a commission rate (e.g. `1.50%`) and a total commission (e.g. `$1,234.50`).

### Use case scenarios

Each scenario becomes an acceptance check. Section 10 maps them to tests.

**Main flow**

| #   | Scenario            | Given                      | When                                                       | Then                                                                                              |
| --- | ------------------- | -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| S1  | Generate a quote    | All three fields are valid | The user clicks **Generate**                               | The button shows "Generating…", then the quote ID, commission rate and total commission are shown |
| S2  | Quote per risk band | Valid amount and term      | The user generates with `LOW`, `MEDIUM` and `HIGH` in turn | Each risk band returns its own quote                                                              |
| S3  | Generate again      | A quote is shown           | The user changes a value and clicks **Generate**           | The previous result is replaced by the new quote                                                  |

**Input errors (handled in the browser before anything is sent)**

| #   | Scenario                | Given                                                      | When                                 | Then                                                                                           |
| --- | ----------------------- | ---------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| E1  | Missing fields          | One or more fields are empty                               | The page is shown or a field changes | **Generate** is disabled                                                                       |
| E2  | Invalid loan amount     | Loan amount is `0`, negative or not a number               | The user leaves the field            | "Enter a loan amount greater than 0" is shown and **Generate** is disabled                     |
| E20 | Loan amount too precise | Loan amount has more than 2 decimal places (e.g. `0.001`)  | The user leaves the field            | "Enter a loan amount with no more than 2 decimal places" is shown and **Generate** is disabled |
| E21 | Loan amount too large   | Loan amount is above `100000000` (e.g. `1e300`)            | The user leaves the field            | "Enter a loan amount up to $100,000,000" is shown and **Generate** is disabled                 |
| E3  | Invalid loan term       | Loan term is `0`, negative, has decimals or is above `600` | The user leaves the field            | "Enter a loan term in whole months from 1 to 600" is shown and **Generate** is disabled        |
| E4  | No risk band            | No risk band is selected                                   | The user leaves the field            | "Select a risk band" is shown and **Generate** is disabled                                     |
| E5  | Double submit           | A request is in progress                                   | The user clicks again                | Nothing happens: the button is disabled until the response arrives                             |

Errors are handled at both hops. Each hop catches **every** failure, including timeouts and network errors, and turns it into a known outcome:

```
UI (browser) ──hop 1──▶ App route (server) ──hop 2──▶ Commission Quote API
```

All errors below are shown in an alert, and the form keeps its values so the user can retry.

**Hop 1: errors between the UI and the app route**

| #   | Scenario                               | Given                                                                                                                                                                      | When                                         | Then                                                                                                                     |
| --- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| E12 | Network error                          | The browser can't reach `/api/commission-quotes` (offline, DNS failure, connection dropped)                                                                                | The user clicks **Generate**                 | The **generic error** is shown; details are logged to the browser console                                                                                      |
| E15 | App route too slow                     | The app route doesn't answer within `GENERATE_QUOTE_REQUEST_TIMEOUT_MS` (10 seconds)                                                                                       | The user clicks **Generate**                 | The request is aborted and the **generic error** is shown; details are logged to the browser console                                                                 |
| E16 | App route crashes                      | The app route throws an unexpected exception                                                                                                                               | The user clicks **Generate**                 | The route catches it and returns `500` `INTERNAL_ERROR`; the server logs the stack trace; the **generic error** is shown |
| E17 | Unexpected response from the app route | The response isn't JSON (e.g. an HTML error page), has a status the UI doesn't expect (e.g. `404`, `405`, `413`), or is a `201` whose body doesn't match `CommissionQuote` | The user clicks **Generate**                 | The **generic error** is shown; details are logged to the browser console                                                |
| E18 | User leaves during a request           | A request is in progress                                                                                                                                                   | The user navigates away or the form unmounts | The request is aborted; no error is shown                                                                                |

**Hop 2: errors between the app route and the Commission Quote API**

| #   | Scenario                              | Given                                                                                                                         | When                                     | Then                                                                                                                                                                                           |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E6  | Invalid request reaches the app route | A request bypasses the form with bad data                                                                                     | It is posted to `/api/commission-quotes` | The route returns `400` with the field issues and the Commission Quote API is **not** called                                                                                                   |
| E7  | Request rejected by the API           | The Commission Quote API returns `422`                                                                                        | The user clicks **Generate**             | The **generic error** is shown; the API's message is logged on the server only                                                                                                                 |
| E8  | API key rejected                      | The Commission Quote API returns `401`                                                                                        | The user clicks **Generate**             | The **generic error** is shown; the server logs an authentication failure                                                                                                                      |
| E9  | Quote service error                   | The Commission Quote API returns `5xx`                                                                                        | The user clicks **Generate**             | The **generic error** is shown; the server logs the status                                                                                                                                     |
| E10 | Unexpected response                   | The Commission Quote API returns a non-JSON body, an unexpected status, or a `201` whose body doesn't match `CommissionQuote` | The user clicks **Generate**             | The **generic error** is shown; the server logs the mismatch                                                                                                                                   |
| E11 | Quote service too slow                | The Commission Quote API doesn't answer within `COMMISSION_QUOTE_API_TIMEOUT_MS`                                              | The user clicks **Generate**             | The **generic error** is shown; the server logs the timeout                                                                                                                                    |
| E19 | Quote service unreachable             | The app route can't connect to the Commission Quote API (connection refused, DNS failure, mock not running)                   | The user clicks **Generate**             | The **generic error** is shown; the server logs the network error                                                                                                                              |
| E13 | Missing configuration                 | `COMMISSION_QUOTE_API_BASE_URL`, `COMMISSION_QUOTE_API_KEY` or `COMMISSION_QUOTE_API_TIMEOUT_MS` is missing or invalid        | The app route handles a request          | The route returns `500` `INTERNAL_ERROR` (our fault, not the vendor's) and the Commission Quote API is **not** called; the **generic error** is shown; the server logs which variable is wrong |

**Recovery**

| #   | Scenario          | Given                   | When                               | Then                                                                    |
| --- | ----------------- | ----------------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| E14 | Retry after error | An error alert is shown | The user clicks **Generate** again | The alert is cleared and the request is sent again with the same values |

**Messages the user can see**

| Message            | Text                                                         | Used for                   |
| ------------------ | ------------------------------------------------------------ | -------------------------- |
| Generic error      | "We couldn't generate a quote right now. Please try again."  | E7–E13, E15–E17, E19       |
| Field errors       | Shown under each field (see E2–E4, E20, E21)                 | E2–E4, E6, E20, E21        |

Every failure after the request is sent, on either hop, shows the same generic error. The user can only do one thing in every case (try again), so separate messages would add UI states without helping them. The specific cause is still logged: hop 1 to the browser console, hop 2 on the server.

**Timeout budget:** the browser waits longer than the server. A slow Commission Quote API is then caught and logged on the server as a timeout (E11) before the browser gives up, and the server never keeps calling the API after the browser has stopped waiting:

```
COMMISSION_QUOTE_API_TIMEOUT_MS (server → API)  5 s   (max 9 s, enforced)
GENERATE_QUOTE_REQUEST_TIMEOUT_MS (browser → app route)  10 s
```

The ordering is **enforced**, not just documented. The config schema rejects a `COMMISSION_QUOTE_API_TIMEOUT_MS` above `GENERATE_QUOTE_REQUEST_TIMEOUT_MS − 1000`. The 1 s margin covers the route's own overhead. A value out of range is a misconfiguration (E13), so the server can never keep waiting after the browser has stopped (see section 7).

## 2. Data model

Defined once in `src/features/commission-quote/model.ts` (Zod schemas + inferred TypeScript types). Used by the form, the app route, the API client and the mock fixture contract test.

### `CommissionQuoteRequest`

| Field              | Type       | Rules                                                                   | Example    |
| ------------------ | ---------- | ----------------------------------------------------------------------- | ---------- |
| `loanAmount`       | number     | Required, greater than 0, at most `100000000`, at most 2 decimal places | `250000`   |
| `loanTermInMonths` | number     | Required, whole number, from 1 to `600`                                 | `360`      |
| `riskBand`         | `RiskBand` | Required, one of `LOW`, `MEDIUM`, `HIGH`                                | `"MEDIUM"` |

The upper limits ($100M, 600 months = 50 years) are sanity ceilings, not business rules. They stop absurd values (`1e300`) from reaching the vendor and keep `formatCurrency` output readable. They are named constants in `model.ts`, so the business can change them in one place.

The 2-decimal check must tolerate floating point: `0.29 * 100` is `28.999999999999996`, so the schema checks `Math.abs(x * 100 - Math.round(x * 100)) < 1e-9` rather than `Number.isInteger(x * 100)`.

### `CommissionQuote`

| Field             | Type   | Meaning                                       | Example          |
| ----------------- | ------ | --------------------------------------------- | ---------------- |
| `quoteId`         | string | Identifier issued by the Commission Quote API | `"Q-MED-0001"`   |
| `commissionRate`  | number | Decimal rate, **not** a percentage            | `0.015` (= 1.5%) |
| `totalCommission` | number | Amount in dollars                             | `3750`           |

### `CommissionQuoteApiError`

Error body returned by the Commission Quote API. It is read and logged on the server only, and is **never** forwarded to the browser.

| Field     | Type   | Example                          |
| --------- | ------ | -------------------------------- |
| `code`    | string | `"VALIDATION_ERROR"`             |
| `message` | string | `"loanAmount is not acceptable"` |

## 3. User interface

Page: `src/app/page.tsx` (Server Component) renders `CommissionQuoteForm` (Client Component).

### Form fields

| Field       | Control                                                | Notes                                        |
| ----------- | ------------------------------------------------------ | -------------------------------------------- |
| Loan amount | Number input, label "Loan amount ($)"                  | Empty means missing                          |
| Loan term   | Number input, label "Loan term (months)"               | Whole numbers only                           |
| Risk band   | Select, label "Risk band", options Low / Medium / High | No default; placeholder "Select a risk band" |

### Behaviour

| State                           | What the user sees                                                                                                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Incomplete or invalid input** | **Generate** is disabled until every field is **valid**, not just filled in. A field shows its error once it has been touched (e.g. "Enter a loan amount greater than 0"). |
| **Valid input**                 | **Generate** is enabled.                                                                                                                                                   |
| **Submitting**                  | Button shows "Generating…" and is disabled; fields are read-only.                                                                                                          |
| **Success**                     | Result panel shows Quote ID, Commission rate (`1.50%`) and Total commission (`$3,750.00`). The form stays filled in so the user can change a value and generate again.     |
| **Error**                       | An alert shows the generic error. The form stays filled in so the user can retry.                                  |

- Validation in the form uses the same `CommissionQuoteRequest` schema as the server.
- The form never calls `fetch` directly. It calls `requestCommissionQuote(input, { signal })` (`generate-quote/request-commission-quote.ts`, client-safe), which:
  - sends `POST /api/commission-quotes`, aborting on **either** of two separate signals (see _Timeout vs unmount_ below);
  - catches **every** failure, including network errors, timeouts, non-JSON bodies, unexpected statuses and bodies that fail the `CommissionQuote` schema;
  - returns a `Result`, so the form only has to map a known kind to a message (see section 6) and never sees an exception.

**Timeout vs unmount.** Both cases make `fetch` reject with an `AbortError`, but E15 must show the generic error and E18 must show nothing. So each case gets its own signal, and the function checks which one fired:

1. **Unmount signal:** the form owns an `AbortController`, aborts it in its effect cleanup and passes `controller.signal` in.
2. **Timeout signal:** `requestCommissionQuote()` creates its own `AbortController` and aborts it with `setTimeout(…, GENERATE_QUOTE_REQUEST_TIMEOUT_MS)`. The timer is cleared in `finally`. It is built on `setTimeout` on purpose, **not** `AbortSignal.timeout()`, so Playwright's `page.clock` and Vitest's fake timers can control it (see section 10).
3. `fetch` gets `AbortSignal.any([unmountSignal, timeoutSignal])`.
4. On an `AbortError`, the **unmount signal is checked first**: if `unmountSignal.aborted`, return `aborted`; otherwise return `timeout`. Unmount wins when both have fired, because there is no component left to show a message in.
5. The form ignores `aborted` and doesn't update state, so nothing is set on an unmounted component.

- Formatting uses `src/shared/lib/format.ts`:
  - `formatPercent(0.015)` → `1.50%`
  - `formatCurrency(3750)` → `$3,750.00`
- Fields, button and alert come from `src/shared/ui/` and are styled with Tailwind.

## 4. App route contract

`POST /api/commission-quotes`, implemented in `src/app/api/commission-quotes/route.ts`.

**Request body:** a `CommissionQuoteRequest`.

```json
{ "loanAmount": 250000, "loanTermInMonths": 360, "riskBand": "MEDIUM" }
```

**Responses:**

| Status | When                                                                                                                                    | Body                                                                                                      |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `201`  | Quote generated                                                                                                                         | `CommissionQuote`                                                                                         |
| `400`  | Request body fails the schema                                                                                                           | `{ "code": "INVALID_REQUEST", "message": "...", "issues": { "loanAmount": ["..."] } }`                    |
| `502`  | **Any third-party failure**: API rejected the request, API key rejected, API error, unexpected API response, timeout or API unreachable | `{ "code": "QUOTE_UNAVAILABLE", "message": "We couldn't generate a quote right now. Please try again." }` |
| `500`  | **Our own fault**: missing or invalid config (E13), or anything the route didn't expect (an uncaught exception, E16)                    | `{ "code": "INTERNAL_ERROR", "message": "We couldn't generate a quote right now. Please try again." }`    |

`502` vs `500` tells monitoring and on-call whose problem it is: `502` means the vendor failed, `500` means we did. A deploy with `COMMISSION_QUOTE_API_KEY` unset shows up as `500`s, so the vendor isn't blamed for it.

- The route only reads JSON, calls `generateCommissionQuote()` and maps the result to a status. It holds no business logic.
- The whole handler is wrapped in one `try/catch`, so the route always returns one of the JSON bodies above and never Next.js's default HTML error page.
- Only three error bodies ever reach the browser: `INVALID_REQUEST` (our own validation), `QUOTE_UNAVAILABLE` (any third-party failure) and `INTERNAL_ERROR` (our own bug or misconfiguration). Upstream status codes, messages, error codes, the API URL, the API key and stack traces are never forwarded.
- The specific failure is logged on the server, so it can still be diagnosed.

## 5. Third-party contract: Commission Quote API

| Item         | Value                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Endpoint     | `POST {COMMISSION_QUOTE_API_BASE_URL}/commission-quotes`                                                                |
| Auth         | Header `x-api-key: {COMMISSION_QUOTE_API_KEY}`                                                                          |
| Request body | `CommissionQuoteRequest`                                                                                                |
| Success      | `201` with `CommissionQuote`                                                                                            |
| Errors       | `401` (bad or missing key), `422` (request rejected), `5xx` (service error), each with a `CommissionQuoteApiError` body |
| Timeout      | Client aborts after `COMMISSION_QUOTE_API_TIMEOUT_MS`                                                                   |

Client: `src/features/commission-quote/api/commission-quote-api-client.ts`. It is server-only. Like the browser-side `requestCommissionQuote()`, it catches **every** failure (network error, timeout, non-JSON body, unexpected status, body failing the `CommissionQuote` schema) and returns a typed outcome instead of throwing.

## 6. Outcome mapping

Both hops return a `Result` (a value or one known failure kind) instead of throwing, so no error can escape unhandled.

### Hop 2: app route → Commission Quote API (server)

`generateCommissionQuote()` (`src/features/commission-quote/generate-quote/generate-commission-quote.ts`) keeps the specific kind so the server can log it. The app route collapses every third-party kind into the one `502` response, and `misconfigured` into `500`.

| Situation                                                          | Scenario | Use case result (server log)            | App route returns         |
| ------------------------------------------------------------------ | -------- | --------------------------------------- | ------------------------- |
| Quote returned                                                     | S1–S3    | `ok` + `CommissionQuote`                | `201`                     |
| Input fails schema                                                 | E6       | `invalid`                               | `400` `INVALID_REQUEST`   |
| API returns `422`                                                  | E7       | `rejected`                              | `502` `QUOTE_UNAVAILABLE` |
| API returns `401`                                                  | E8       | `unauthorized`                          | `502` `QUOTE_UNAVAILABLE` |
| API returns `5xx`                                                  | E9       | `upstream`                              | `502` `QUOTE_UNAVAILABLE` |
| API body is not JSON, has an unexpected status or fails the schema | E10      | `invalid-response`                      | `502` `QUOTE_UNAVAILABLE` |
| API times out                                                      | E11      | `timeout`                               | `502` `QUOTE_UNAVAILABLE` |
| API unreachable                                                    | E19      | `unreachable`                           | `502` `QUOTE_UNAVAILABLE` |
| Config missing or invalid                                          | E13      | `misconfigured`                         | `500` `INTERNAL_ERROR`    |
| Uncaught exception in the route                                    | E16      | n/a (caught by the route's `try/catch`) | `500` `INTERNAL_ERROR`    |

### Hop 1: UI → app route (browser)

`requestCommissionQuote()` (`src/features/commission-quote/generate-quote/request-commission-quote.ts`) turns every response, or the lack of one, into a kind. The form maps the kind to a message.

| What the browser gets                                         | Scenario    | `requestCommissionQuote()` result             | UI shows                  |
| ------------------------------------------------------------- | ----------- | --------------------------------------------- | ------------------------- |
| `201` with a valid `CommissionQuote`                          | S1–S3       | `ok` + `CommissionQuote`                      | Result panel              |
| `400` `INVALID_REQUEST`                                       | E6          | `invalid` + field issues                      | Field errors              |
| `502` `QUOTE_UNAVAILABLE`                                     | E7–E11, E19 | `unavailable`                                 | Generic error             |
| `500` `INTERNAL_ERROR`                                        | E13, E16    | `unavailable`                                 | Generic error             |
| Non-JSON body, unexpected status, or `201` failing the schema | E17         | `unexpected` (details to the browser console) | Generic error             |
| `AbortError` and only the timeout signal fired                | E15         | `timeout`                                     | Generic error             |
| `fetch` throws a network error                                | E12         | `network`                                     | Generic error             |
| `AbortError` and the unmount signal fired (checked first)     | E18         | `aborted`                                     | Nothing (no state update) |

`timeout`, `network` and `unexpected` all show the generic error but stay separate kinds, so the browser console log and the tests can tell them apart.

The API key, the API URL, stack traces and anything the Commission Quote API returns in an error are never sent to the browser.

## 7. Configuration

Read only on the server, from `.env.local`, by `commission-quote-api-config.ts`. Parsed with Zod through `src/shared/config/env.ts`. If a value is missing or invalid, the server logs an error naming the variable and the request fails as in scenario E13 (`500`). The variable names and values are never sent to the browser.

| Variable                          | Rule                                                                               | Local default                                |
| --------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------- |
| `COMMISSION_QUOTE_API_BASE_URL`   | Valid URL                                                                          | `http://localhost:4010/commission-quote-api` |
| `COMMISSION_QUOTE_API_KEY`        | Non-empty                                                                          | `local-dev-key`                              |
| `COMMISSION_QUOTE_API_TIMEOUT_MS` | Whole number from 1 to `GENERATE_QUOTE_REQUEST_TIMEOUT_MS − 1000` (9000), optional | `5000`                                       |

The browser-side timeout is **not** an env variable. `GENERATE_QUOTE_REQUEST_TIMEOUT_MS` (`10000`) is a constant in `src/features/commission-quote/timeouts.ts`, a plain module with no `server-only` import. Both `request-commission-quote.ts` (browser) and `commission-quote-api-config.ts` (server) import it, so the upper limit on `COMMISSION_QUOTE_API_TIMEOUT_MS` comes from the real constant and can't drift. Setting it to `15000` fails config parsing with a message that names the variable and the limit.

## 8. Mock Commission Quote API

Location: `mock-api/commission-quote-api/`, served by `mock-api/server.mjs` on port `4010` under the path prefix `/commission-quote-api`. So the endpoint is `POST http://localhost:4010/commission-quote-api/commission-quotes`. The expected key comes from `MOCK_API_KEY`, default `local-dev-key`.

The mock returns **pre-configured JSON only**. It does not calculate anything, so `totalCommission` is a fixed value per risk band whatever loan amount is entered.

### Scenarios

Rules live in `scenarios.json` and are checked in order:

| #   | Request                                                                                                 | Response                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Missing or wrong `x-api-key`                                                                            | `401` `unauthorized.json`                                                                                                 |
| 2   | `loanAmount` equals `forceErrorLoanAmount` (default `13`)                                               | **One error picked at random** from the error pool below. A deterministic way to get _an_ error, for demos and e2e tests. |
| 3   | **Any other request, at random**, with probability `MOCK_ERROR_RATE` (default `0.2`, i.e. about 1 in 5) | **One error picked at random** from the error pool below                                                                  |
| 4   | `riskBand` = `LOW`                                                                                      | `201` `quote-low.json`                                                                                                    |
| 5   | `riskBand` = `MEDIUM`                                                                                   | `201` `quote-medium.json`                                                                                                 |
| 6   | `riskBand` = `HIGH`                                                                                     | `201` `quote-high.json`                                                                                                   |

Rule 3 is the real simulation of network conditions. Any valid request can fail without warning, as a real vendor API might. Rule 2 exists only so that error handling can be shown and tested on demand. `MOCK_ERROR_RATE` takes a number from `0` (never) to `1` (always). Playwright sets it to `0`, so happy-path e2e tests never fail at random.

**Error pool** (listed in `scenarios.json`, so it can be changed without code):

| Error               | Response                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Request rejected    | `422` `validation-error.json`                                                            |
| Server error        | `500` `server-error.json`                                                                |
| Service unavailable | `503` `service-unavailable.json`                                                         |
| Unexpected response | `201` `invalid-quote.json` (body doesn't match `CommissionQuote`)                        |
| Timeout             | No reply for `MOCK_TIMEOUT_DELAY_MS` (default `10000`), longer than the app's timeout    |
| Connection dropped  | The mock closes the socket without replying, so the app route sees a network error (E19) |

- The mock prints the error it picked and why to its terminal, e.g. `[mock] random failure (rate 0.2) → 503 service-unavailable` or `[mock] forced (loanAmount 13) → 422 validation-error`, so you can see what happened behind the generic message.
- Because the browser only ever shows the generic error for a hop 2 failure, _which_ error is picked never changes what a user or an e2e test sees. Tests that need one specific error use MSW in unit tests instead (see below).

Example fixture values:

| Fixture             | `quoteId`     | `commissionRate` | `totalCommission` |
| ------------------- | ------------- | ---------------- | ----------------- |
| `quote-low.json`    | `Q-LOW-0001`  | `0.01`           | `2500`            |
| `quote-medium.json` | `Q-MED-0001`  | `0.015`          | `3750`            |
| `quote-high.json`   | `Q-HIGH-0001` | `0.02`           | `5000`            |

The mock keeps no state between requests, so parallel e2e tests don't interfere with each other.

**Adding an error:** add a JSON file to `fixtures/` and an entry to the error pool in `scenarios.json`. No code change is needed. `fixtures.contract.test.ts` fails if a fixture no longer matches the data model (except `invalid-quote.json`, which must **fail** to parse as `CommissionQuote`).

The same fixtures are served by MSW in unit tests. There, each test picks the exact fixture it needs (no randomness), so every error kind is tested deterministically.

The mock only covers hop 2. Hop 1 errors (E12, E15–E18) can't come from the mock, because they happen between the browser and our own app route. They are tested by stubbing `fetch` in browser tests and by intercepting `/api/commission-quotes` with Playwright's `page.route()` in e2e tests (see section 10).

## 9. Files

```
src/
├── app/
│   ├── page.tsx                                   # renders the form
│   ├── page.e2e.ts
│   └── api/commission-quotes/
│       ├── route.ts
│       └── route.test.ts
├── features/commission-quote/
│   ├── model.ts · model.test.ts
│   ├── timeouts.ts                                # GENERATE_QUOTE_REQUEST_TIMEOUT_MS (shared by browser + server)
│   ├── generate-quote/
│   │   ├── generate-commission-quote.ts · .test.ts      # hop 2 use case (server-only)
│   │   ├── request-commission-quote.ts · .test.ts       # hop 1 call to the app route (client-safe)
│   │   ├── commission-quote-form.tsx · .browser.test.tsx
│   │   └── commission-quote-result.tsx · .browser.test.tsx
│   └── api/
│       ├── commission-quote-api-config.ts · .test.ts
│       ├── commission-quote-api-client.ts · .test.ts
│       └── fixtures.contract.test.ts
└── shared/
    ├── ui/        button, number-field, select-field, alert
    ├── lib/       format.ts · format.test.ts, result.ts
    └── config/    env.ts · env.test.ts
mock-api/
├── server.mjs                # serves each <name>-api/ folder under /<name>-api
└── commission-quote-api/
    ├── scenarios.json        # rules, forceErrorLoanAmount, error pool
    └── fixtures/             # quote-low|medium|high, unauthorized, validation-error,
                              # server-error, service-unavailable, invalid-quote
                              # (timeout and connection-dropped are rules, not files)
```

## 10. Tests

| Layer              | File                                                 | Covers                                                                                                                                                                                                                                                                                                                              | Scenarios                  |
| ------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Model              | `model.test.ts`                                      | Each field required; amount > 0, ≤ 100,000,000 and at most 2 decimals (`0.29` and `0.1 + 0.2` accepted, `0.001` and `1e300` rejected); term is a whole number from 1 to 600; risk band limited to the three values                                                                                                                  | E1–E4, E20, E21 rules      |
| Fixtures           | `fixtures.contract.test.ts`                          | Every success fixture parses as `CommissionQuote`; every error fixture as `CommissionQuoteApiError`; `invalid-quote.json` does **not** parse                                                                                                                                                                                        | S2, E7–E10 data            |
| Config             | `commission-quote-api-config.test.ts`, `env.test.ts` | Missing or invalid values fail with a message naming the variable; timeout default applied; timeout `9000` accepted, `9001` and `15000` rejected                                                                                                                                                                                    | E13                        |
| API client (hop 2) | `commission-quote-api-client.test.ts`                | Sends `x-api-key`; parses success; maps 401, 422, 5xx, non-JSON body, unexpected status, schema mismatch, timeout and network error; never throws                                                                                                                                                                                   | S1, E7–E11, E19            |
| Use case (hop 2)   | `generate-commission-quote.test.ts`                  | Invalid input is rejected without calling the API; a quote for each risk band; each specific failure kind; missing config                                                                                                                                                                                                           | S2, E6–E11, E13, E19       |
| App route          | `route.test.ts`                                      | `ok` → `201`; `invalid` or non-JSON request body → `400`; **every** third-party kind → the same `502` generic body; `misconfigured` and a thrown exception → `500` `INTERNAL_ERROR`; no upstream detail or stack trace in any body                                                                                                  | E6–E11, E13, E16, E19      |
| Request (hop 1)    | `request-commission-quote.test.ts`                   | Maps `201`, `400`, `500`, `502`, non-JSON body, unexpected status, schema mismatch, network error to their kinds; with fake timers: timer fires → `timeout`; unmount signal aborted → `aborted`; both fired → `aborted`; timer cleared after a response; never throws                                                               | E6, E12, E15–E18           |
| Formatting         | `format.test.ts`                                     | `0.015` → `1.50%`; `3750` → `$3,750.00`                                                                                                                                                                                                                                                                                             | S1                         |
| Form (browser)     | `commission-quote-form.browser.test.tsx`             | Generate disabled until valid; field errors after touch; no double submit; every failure kind shows the generic error; no message after unmount; alert cleared on retry; new result replaces old                                                                                                                 | S3, E1–E5, E12, E14–E18, E20, E21 |
| Result (browser)   | `commission-quote-result.browser.test.tsx`           | Shows quote ID, formatted rate and total                                                                                                                                                                                                                                                                                            | S1                         |
| End to end         | `page.e2e.ts`                                        | A quote for each risk band; Generate disabled until valid; the forced-error amount (`13`) shows the generic error; changing the amount and generating again clears the alert and shows a quote. Hop 1 failures via `page.route()` on `/api/commission-quotes`: request aborted, never answered with the clock advanced past the timeout, and HTML `500` page each show the generic error | S1–S2, E1, E7–E12, E14–E17 |

Playwright starts the mock with `MOCK_ERROR_RATE=0` (no random failures, so tests are deterministic) and the app with `COMMISSION_QUOTE_API_TIMEOUT_MS=1000`, so a timeout picked from the pool for the forced-error amount fails within about a second instead of five.

The timeout e2e test calls `page.clock.install()` **before** `page.goto()`, has `page.route()` hold the request without answering, then calls `page.clock.runFor(GENERATE_QUOTE_REQUEST_TIMEOUT_MS)`. This works because the browser timeout is a plain `setTimeout`, which `page.clock` fakes (see section 3). `AbortSignal.timeout()` would not be reliably faked, and the test would hang.

## 11. Out of scope

- Login (see the extension points in doc 01).
- Quote approval. Planned location: `src/features/commission-quote/approve-quote/` (use case + button); app route `src/app/api/commission-quotes/[quoteId]/approval/route.ts`; a new function in the existing API client; new fixtures and rules in `mock-api/commission-quote-api/`.
- Storing quotes in this app. The quote exists only in the Commission Quote API and on screen.
- Calculating commission locally. The Commission Quote API is the source of truth.
