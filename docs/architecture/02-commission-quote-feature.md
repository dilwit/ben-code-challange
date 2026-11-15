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

| #   | Scenario            | Given                      | When                                                       | Then                                                                                                                                     |
| --- | ------------------- | -------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Generate a quote    | All three fields are valid | The user clicks **Generate**                               | The button shows "Generating…", then the quote ID, commission rate and total commission are shown                                        |
| S2  | Quote per risk band | Valid amount and term      | The user generates with `LOW`, `MEDIUM` and `HIGH` in turn | Each risk band returns its own quote                                                                                                     |
| S3  | Generate again      | A quote is shown           | The user changes a value, then clicks **Generate Quote**   | The old quote disappears as soon as the value changes (so a shown quote always matches the form); the new quote is shown after the click |

**Input errors (handled in the browser before anything is sent)**

| #   | Scenario                | Given                                                      | When                               | Then                                                                                   |
| --- | ----------------------- | ---------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| E1  | Missing fields          | One or more fields are empty                               | The user clicks **Generate Quote** | Every missing field shows its error, focus moves to the first one, and nothing is sent |
| E2  | Invalid loan amount     | Loan amount is `0`, negative or not a number               | The user clicks **Generate Quote** | "Enter a loan amount greater than 0" is shown and nothing is sent                      |
| E20 | Loan amount too precise | Loan amount has more than 2 decimal places (e.g. `0.001`)  | The user clicks **Generate Quote** | "Enter a loan amount with no more than 2 decimal places" is shown and nothing is sent  |
| E21 | Loan amount too large   | Loan amount is above `100000000` (e.g. `1e300`)            | The user clicks **Generate Quote** | "Enter a loan amount up to $100,000,000" is shown and nothing is sent                  |
| E3  | Invalid loan term       | Loan term is `0`, negative, has decimals or is above `600` | The user clicks **Generate Quote** | "Enter a loan term in whole months from 1 to 600" is shown and nothing is sent         |
| E4  | No risk band            | No risk band is selected                                   | The user clicks **Generate Quote** | "Select a risk band" is shown and nothing is sent                                      |
| E5  | Double submit           | A request is in progress                                   | The user clicks again              | Nothing happens: the button is disabled until the response arrives                     |

Errors are handled at both hops. Each hop catches **every** failure, including timeouts and network errors, and turns it into a known outcome:

```
UI (browser) ──hop 1──▶ App route (server) ──hop 2──▶ Commission Quote API
```

All errors below are shown in an alert, and the form keeps its values so the user can retry.

**Hop 1: errors between the UI and the app route**

| #   | Scenario                               | Given                                                                                                                                                                      | When                                         | Then                                                                                                           |
| --- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| E12 | Network error                          | The browser can't reach `/api/commission-quotes` (offline, DNS failure, connection dropped)                                                                                | The user clicks **Generate**                 | The **generic error** is shown; details are logged to the browser console                                      |
| E15 | App route too slow                     | The app route doesn't answer within `GENERATE_QUOTE_REQUEST_TIMEOUT_MS` (10 seconds)                                                                                       | The user clicks **Generate**                 | The request is aborted and the **generic error** is shown; details are logged to the browser console           |
| E16 | App route crashes                      | The app route throws an unexpected exception                                                                                                                               | The user clicks **Generate**                 | The route catches it and returns `500` `fail`; the server logs the stack trace; the **generic error** is shown |
| E17 | Unexpected response from the app route | The response isn't JSON (e.g. an HTML error page), has a status the UI doesn't expect (e.g. `404`, `405`, `413`), or is a `201` whose body doesn't match `CommissionQuote` | The user clicks **Generate**                 | The **generic error** is shown; details are logged to the browser console                                      |
| E18 | User leaves during a request           | A request is in progress                                                                                                                                                   | The user navigates away or the form unmounts | The request is aborted; no error is shown                                                                      |

**Hop 2: errors between the app route and the Commission Quote API**

| #   | Scenario                              | Given                                                                                                                         | When                                     | Then                                                                                                                                                                                    |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E6  | Invalid request reaches the app route | A request bypasses the form with bad data                                                                                     | It is posted to `/api/commission-quotes` | The route returns `400` with the generic validation message, logs which fields failed, and the Commission Quote API is **not** called                                                   |
| E7  | Request rejected by the API           | The Commission Quote API returns `422`                                                                                        | The user clicks **Generate**             | The **generic error** is shown; the API's message is logged on the server only                                                                                                          |
| E8  | API key rejected                      | The Commission Quote API returns `401`                                                                                        | The user clicks **Generate**             | The **generic error** is shown; the server logs an authentication failure                                                                                                               |
| E9  | Quote service error                   | The Commission Quote API returns `5xx`                                                                                        | The user clicks **Generate**             | The **generic error** is shown; the server logs the status                                                                                                                              |
| E10 | Unexpected response                   | The Commission Quote API returns a non-JSON body, an unexpected status, or a `201` whose body doesn't match `CommissionQuote` | The user clicks **Generate**             | The **generic error** is shown; the server logs the mismatch                                                                                                                            |
| E11 | Quote service too slow                | The Commission Quote API doesn't answer within `COMMISSION_QUOTE_API_TIMEOUT_MS`                                              | The user clicks **Generate**             | The **generic error** is shown; the server logs the timeout                                                                                                                             |
| E19 | Quote service unreachable             | The app route can't connect to the Commission Quote API (connection refused, DNS failure, mock not running)                   | The user clicks **Generate**             | The **generic error** is shown; the server logs the network error                                                                                                                       |
| E13 | Missing configuration                 | `COMMISSION_QUOTE_API_BASE_URL`, `COMMISSION_QUOTE_API_KEY` or `COMMISSION_QUOTE_API_TIMEOUT_MS` is missing or invalid        | The server starts                        | The server **refuses to start**: it prints every invalid variable (never a value) and exits with code 1, so nothing is served. Checked once in `src/instrumentation.ts` (see section 7) |

**Recovery**

| #   | Scenario          | Given                   | When                               | Then                                                                    |
| --- | ----------------- | ----------------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| E14 | Retry after error | An error alert is shown | The user clicks **Generate** again | The alert is cleared and the request is sent again with the same values |

**Messages the user can see**

| Message       | Text                                                        | Used for             |
| ------------- | ----------------------------------------------------------- | -------------------- |
| Generic error | "We couldn't generate a quote right now. Please try again." | E7–E12, E15–E17, E19 |
| Field errors  | Shown under each field by the form's own validation         | E2–E4, E20, E21      |

Every failure after the request is sent, on either hop, shows the same generic error. The user can only do one thing in every case (try again), so separate messages would add UI states without helping them. The specific cause is still logged: hop 1 to the browser console, hop 2 on the server.

**Timeout budget:** the browser waits longer than the server. A slow Commission Quote API is then caught and logged on the server as a timeout (E11) before the browser gives up, and the server never keeps calling the API after the browser has stopped waiting:

```
COMMISSION_QUOTE_API_TIMEOUT_MS (server → API)  5 s   (max 9 s, enforced)
GENERATE_QUOTE_REQUEST_TIMEOUT_MS (browser → app route)  10 s
```

The ordering is **enforced**, not just documented. The config check rejects a `COMMISSION_QUOTE_API_TIMEOUT_MS` above `GENERATE_QUOTE_REQUEST_TIMEOUT_MS − 1000`. The 1 s margin covers the route's own overhead. A value out of range stops the server from starting (E13), so it can never keep waiting after the browser has stopped (see section 7).

## 2. Data model

Defined once in `src/features/commission-quote/model.ts` (Zod schemas + inferred TypeScript types). Used by the form, the app route, the API client and the browser action.

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

| Field       | Control                                                       | Notes                                        |
| ----------- | ------------------------------------------------------------- | -------------------------------------------- |
| Loan amount | Text input, `inputMode="decimal"`, label "Loan amount ($)"    | Empty means missing                          |
| Loan term   | Text input, `inputMode="numeric"`, label "Loan term (months)" | Whole numbers only                           |
| Risk band   | Select, label "Risk band", options Low / Medium / High        | No default; placeholder "Select a risk band" |

### Behaviour

| State                                              | What the user sees                                                                                                                                                                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Before the first click**                         | No errors are shown, even after leaving a field. **Generate Quote** is enabled.                                                                                                                                                                                                       |
| **Generate clicked with missing or invalid input** | Every invalid field shows its error (e.g. "Enter a loan amount greater than 0"), focus moves to the first one, and nothing is sent. Errors then update as the user types and clear once the value is valid.                                                                           |
| **Submitting**                                     | Button shows "Generating…" and is disabled; the fields are disabled too (one `<fieldset disabled>`), so the values can't change mid-request.                                                                                                                                          |
| **Success**                                        | Result panel shows Quote ID, Commission rate (`1.50%`) and Total commission (`$3,750.00`). The form stays filled in so the user can change a value and generate again. **Any change to a field clears the shown quote**, so staff can never copy a quote that doesn't match the form. |
| **Error**                                          | An alert shows the generic error. The form stays filled in so the user can retry.                                                                                                                                                                                                     |

- **React Hook Form** runs the validation, through `zodResolver`, with `mode: 'onSubmit'` and `reValidateMode: 'onChange'`. Errors first appear when **Generate Quote** is clicked, all at once, and focus moves to the first invalid field; after that they update as the user types.
- **Generate Quote is never disabled for invalid input**, only while a request is in progress (E5). A disabled button can't be focused, many screen readers skip it, and it doesn't say why; clicking it now explains what's missing.
- **No errors on leaving a field:** an error appearing then pushes the button down while it's being pressed, so the mouse is released somewhere else and the click is lost. Validating on submit avoids that.
- The form validates with the **same `commissionQuoteRequestSchema` as the server** (`model.ts`), passed to `zodResolver` as is, so the rules and messages can't drift apart:
  - The number fields are registered with **`valueAsNumber`**: their text becomes a number, and empty or unreadable text (`abc`) becomes `NaN`, which the schema rejects with the field's message.
  - The risk band starts on its empty placeholder (`defaultValue=""`; otherwise the browser would select Low), which the schema rejects as missing.
- **Text inputs with `inputMode`, not `type="number"`:** a number input blanks text the browser can't read (`abc`, `1,000`), so the form couldn't tell it from an empty field, and it accepts `e`. A text input keeps exactly what was typed, while `inputMode` still brings up the number keyboard on phones.
- **Accessibility:** each field has a `<label>`. Its error is linked with `aria-describedby`, and the field gets `aria-invalid` while it has one.
- The form never calls `fetch` directly. It calls `requestCommissionQuote(input, { signal })` (`generate-quote/request-commission-quote.ts`, browser-only via `import 'client-only'`; a plain function calling the app route), which:
  - sends `POST /api/commission-quotes`, aborting on **either** of two separate signals (see _Timeout vs unmount_ below);
  - catches **every** failure, including network errors, timeouts, non-JSON bodies, unexpected statuses and bodies that fail the `CommissionQuote` schema;
  - returns the **same `{ status, data }` shape as the route** (`ApiResponse<CommissionQuote>`), so the form only checks `status`: `success` shows the quote, `fail` shows `data.message` in the alert. Its own failures (timeout, network error, a reply it can't read) become a `fail` with the generic message, and the reason is logged to the browser console. It never throws.

**Timeout vs unmount.** Both cases make `fetch` reject with an `AbortError`, but E15 must show the generic error and E18 must show nothing. So each case gets its own signal, and the function checks which one fired:

1. **Unmount signal:** the form owns an `AbortController`, aborts it in its effect cleanup and passes `controller.signal` in.
2. **Timeout signal:** `requestCommissionQuote()` creates its own `AbortController` and aborts it with `setTimeout(…, GENERATE_QUOTE_REQUEST_TIMEOUT_MS)`. The timer is cleared in `finally`. It is built on `setTimeout` on purpose, **not** `AbortSignal.timeout()`, so Vitest's fake timers can control it (see section 10).
3. `fetch` gets `AbortSignal.any([unmountSignal, timeoutSignal])`.
4. On an `AbortError`, the **unmount signal is checked first**: if it fired, the action returns a `fail` **without logging**; otherwise it is a timeout, which is logged. Unmount wins when both have fired, because there is no component left to show a message in.
5. After the call, the form checks its own `signal.aborted` and returns without updating state, so nothing is set on an unmounted component.

- Formatting uses `src/shared/lib/format.ts`, with `en-AU` formatting. Amounts are **Australian dollars (AUD)**:
  - `formatPercent(0.015)` → `1.50%`
  - `formatCurrency(3750)` → `$3,750.00`
- The fields, button and (later) alert are plain HTML elements inline in the form, styled with Tailwind. There is no `shared/ui` layer: the form is the only place they are used.

## 4. App route contract

`POST /api/commission-quotes`, implemented in `src/app/api/commission-quotes/route.ts`.

**Request body:** a `CommissionQuoteRequest`.

```json
{ "loanAmount": 250000, "loanTermInMonths": 360, "riskBand": "MEDIUM" }
```

**Responses:**

Every answer has the same shape, `{ status, data }` (`src/shared/lib/api-response.ts`). The HTTP status code still says what happened:

| Status | When                                                                                                                                    | Body                                                                                                              |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `201`  | Quote generated                                                                                                                         | `{ "status": "success", "data": { "quoteId": "…", "commissionRate": 0.015, "totalCommission": 3750 } }`           |
| `400`  | Body isn't JSON                                                                                                                         | `{ "status": "fail", "data": { "message": "The request body must be JSON." } }`                                   |
| `400`  | Body fails the schema                                                                                                                   | `{ "status": "fail", "data": { "message": "Some loan details aren't valid. Please check them and try again." } }` |
| `502`  | **Any third-party failure**: API rejected the request, API key rejected, API error, unexpected API response, timeout or API unreachable | `{ "status": "fail", "data": { "message": "We couldn't generate a quote right now. Please try again." } }`        |
| `500`  | **Our own fault**: anything the route didn't expect (an uncaught exception, E16)                                                        | `{ "status": "fail", "data": { "message": "We couldn't generate a quote right now. Please try again." } }`        |

`502` vs `500` tells monitoring and on-call whose problem it is: `502` means the vendor failed, `500` means we did. A deploy with `COMMISSION_QUOTE_API_KEY` unset never gets this far: the server refuses to start (E13).

- The route reads JSON, validates it with `commissionQuoteRequestSchema` (the same rules and messages as the form; unknown fields are dropped), calls `postCommissionQuote()` and maps the result to a status. The rules themselves live in `model.ts`, not in the route.
- The whole handler is wrapped in one `try/catch`, so the route always returns one of the JSON bodies above and never Next.js's default HTML error page.
- A `fail` body only ever carries our own `message`, built with `successResponse()` / `failResponse()`. Upstream status codes, messages, error codes, the API URL, the API key and stack traces are never forwarded.
- The specific failure is logged on the server, so it can still be diagnosed.

## 5. Third-party contract: Commission Quote API

| Item         | Value                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Endpoint     | `POST {COMMISSION_QUOTE_API_BASE_URL}/commission-quotes`                                                                |
| Auth         | Header `api-key: {COMMISSION_QUOTE_API_KEY}`                                                                            |
| Request body | `CommissionQuoteRequest`                                                                                                |
| Success      | `201` with `CommissionQuote`                                                                                            |
| Errors       | `401` (bad or missing key), `422` (request rejected), `5xx` (service error), each with a `CommissionQuoteApiError` body |
| Timeout      | Client aborts after `COMMISSION_QUOTE_API_TIMEOUT_MS`                                                                   |

Client: `src/features/commission-quote/vendor/commission-quote-api-client.ts`. It is server-only. Its function is `postCommissionQuote(request, config?)`; `config` defaults to the settings from the environment (checked at startup), so the route just calls `postCommissionQuote(request)` and tests can pass their own. Like the browser-side `requestCommissionQuote()`, it catches **every** failure (network error, timeout, non-JSON body, unexpected status, body failing the `CommissionQuote` schema) and never throws. For anything other than a valid `201` quote it **logs the specific reason on the server** and returns `null`. Its return type is `CommissionQuote | null`, so the route then only has to choose between `201` and `502`.

## 6. Outcome mapping

Neither hop throws for an expected failure, so no error can escape unhandled. The server-side client returns `CommissionQuote | null`, and the browser action returns `{ status, data }`. TypeScript makes each caller handle the failure case before it can use the quote.

### Hop 2: app route → Commission Quote API (server)

The route validates the input, then calls `postCommissionQuote()` (`src/features/commission-quote/vendor/commission-quote-api-client.ts`). The client logs the specific reason (`[commission-quote] Commission Quote API …`) and returns `null` for every vendor failure, which the route turns into the one `502` response.

| Situation                                         | Scenario | Server log (`[commission-quote] Commission Quote API …`) | App route returns |
| ------------------------------------------------- | -------- | -------------------------------------------------------- | ----------------- |
| Quote returned                                    | S1–S3    | nothing                                                  | `201`             |
| Input fails schema                                | E6       | `[commission-quote] invalid request <field errors>`      | `400` `fail`      |
| API returns `422`                                 | E7       | `rejected the request (422 <code>: <message>)`           | `502` `fail`      |
| API returns `401`                                 | E8       | `rejected the API key (401 <code>: <message>)`           | `502` `fail`      |
| API returns `5xx`                                 | E9       | `failed (<status> <code>: <message>)`                    | `502` `fail`      |
| `201` body is not JSON or not a `CommissionQuote` | E10      | `returned a 201 that is not a CommissionQuote`           | `502` `fail`      |
| Any other status                                  | E10      | `returned an unexpected status <status>`                 | `502` `fail`      |
| API times out                                     | E11      | `timed out after <timeoutMs> ms`                         | `502` `fail`      |
| API unreachable                                   | E19      | `unreachable: <error> (<cause>)`                         | `502` `fail`      |
| Uncaught exception in the route                   | E16      | `[commission-quote] unexpected error` + the error        | `500` `fail`      |

### Hop 1: UI → app route (browser)

`requestCommissionQuote()` (`src/features/commission-quote/generate-quote/request-commission-quote.ts`) reads the body's `status` (not the HTTP code) and returns `{ status, data }` to the form for every response, or the lack of one. The form shows the quote, or `data.message` in the alert.

| What the browser gets                                                                                            | Scenario         | Returns                              | Browser console                                  | UI shows                                                           |
| ---------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------ |
| `{ status: 'success' }` with a valid `CommissionQuote` as `data`                                                 | S1–S3            | `{ status: 'success', data: quote }` | nothing                                          | Result panel                                                       |
| `{ status: 'fail' }` with `502` / `500`                                                                          | E7–E11, E16, E19 | the route's `fail`, unchanged        | `<status> <message>`                             | `data.message` (the generic error)                                 |
| `{ status: 'fail' }` with `400` (only if form and server rules are out of step, e.g. an old tab during a deploy) | E6               | the route's `fail`, unchanged        | `400 <message>`                                  | "Some loan details aren't valid. Please check them and try again." |
| Not a `{ status, data }` body (e.g. an HTML error page or non-JSON), or `success` without a valid quote          | E17              | generic `fail`                       | `<status> reply is not a valid { status, data }` | Generic error                                                      |
| No answer within `GENERATE_QUOTE_REQUEST_TIMEOUT_MS`                                                             | E15              | generic `fail`                       | `no answer within 10000 ms`                      | Generic error                                                      |
| `fetch` throws a network error                                                                                   | E12              | generic `fail`                       | `network error: <message>`                       | Generic error                                                      |
| The unmount signal fired (checked first)                                                                         | E18              | generic `fail`                       | nothing                                          | Nothing (the form checks its own signal; no state update)          |

The API key, the API URL, stack traces and anything the Commission Quote API returns in an error are never sent to the browser.

## 7. Configuration

Read only on the server, from `.env.local`, by `readCommissionQuoteApiConfig()` in `commission-quote-api-config.ts`, which starts with `import 'server-only'`. It returns `{ baseUrl, apiKey, timeoutMs }`, or **throws** one error listing every problem.

**Checked at startup (E13):** `src/instrumentation.ts` runs `register()` when the server starts, and on Node.js it loads `src/instrumentation-node.ts`, which calls it once. (The check is in its own file because `instrumentation.ts` is also compiled for the Edge runtime, which has no `process.exit`.) On an error it prints the problem list and calls `process.exit(1)`. A plain `throw` isn't enough: Next only logs an error from `register()` and keeps serving, answering every request with `500`. Verified with both `next start` and `next dev`. With `pnpm dev`, `concurrently` then stops the mock too. `next build` doesn't run `register()`, so building works without `.env.local`. Request-time code can assume the config is valid; if it ever threw anyway, the route's `try/catch` would return `500` (E16).

```
Invalid Commission Quote API configuration:
  - COMMISSION_QUOTE_API_BASE_URL: must be an http(s) URL
  - COMMISSION_QUOTE_API_KEY: must not be empty
```

Each problem reads `"<VARIABLE>: <rule>"`, and **values are never included**, so the API key can't end up in a log. The config is read on every call (cheap), so tests can pass their own env object.

| Variable                          | Rule                                                                                                 | Local default                                    |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `COMMISSION_QUOTE_API_BASE_URL`   | `http` or `https` URL (`localhost` allowed). A trailing `/` is removed.                              | `http://localhost:4010/commission-quote-api`     |
| `COMMISSION_QUOTE_API_KEY`        | Not empty after trimming                                                                             | `local-dev-key`                                  |
| `COMMISSION_QUOTE_API_TIMEOUT_MS` | Optional; empty counts as unset. Whole number from 1 to `COMMISSION_QUOTE_API_TIMEOUT_MAX_MS` (9000) | `COMMISSION_QUOTE_API_TIMEOUT_DEFAULT_MS` (5000) |

The browser-side timeout is **not** an env variable: `GENERATE_QUOTE_REQUEST_TIMEOUT_MS` (`10000`) lives in `model.ts`, which is client-safe and imported by both the browser action and the server config. That way the vendor config (`vendor/`) doesn't depend on a UI module. The server-side constants are local to `commission-quote-api-config.ts`, the only file that uses them:

- `COMMISSION_QUOTE_API_TIMEOUT_DEFAULT_MS` (`5000`);
- `COMMISSION_QUOTE_API_TIMEOUT_MAX_MS` (`GENERATE_QUOTE_REQUEST_TIMEOUT_MS − 1000`), worked out from the browser constant so the two can't drift apart.

Both `request-commission-quote.ts` (browser) and `commission-quote-api-config.ts` (server) import it, so the upper limit can't drift. Setting the timeout to `15000` fails with `COMMISSION_QUOTE_API_TIMEOUT_MS: must be a whole number from 1 to 9000`.

**Unit tests and `server-only`:** the package throws when loaded outside a React Server bundler, Vitest in Node included. The Vitest `unit` project therefore aliases it to the package's own empty module. `next build` still enforces the boundary.

## 8. Mock Commission Quote API

Location: `mock-api/commission-quote-api/`, served by `mock-api/server.mjs` under the path prefix `/commission-quote-api`. So the endpoint is `POST http://localhost:4010/commission-quote-api/commission-quotes`. `pnpm mock` runs it on its own; `pnpm dev` runs it alongside the app.

Its settings are constants at the top of `server.mjs`. It reads no environment variables, so changing one means editing the file and restarting:

| Constant           | Value   | Meaning                                                                 |
| ------------------ | ------- | ----------------------------------------------------------------------- |
| `PORT`             | `4010`  | Port to listen on                                                       |
| `ERROR_RATE`       | `0.2`   | Share of requests that fail at random, from `0` (never) to `1` (always) |
| `TIMEOUT_DELAY_MS` | `10000` | How long the "timeout" error waits before closing the connection        |

`server.mjs` is kept deliberately small (about 90 lines, Node built-ins only), because it is a local stand-in, not production code. It doesn't check fixtures at startup. A typo shows up as a wrong response or a crash in the `[mock]` output.

**API key:** the mock accepts any non-empty `api-key`; it doesn't check the value. A missing or empty header gets `401` (E8). The app never sends one, because it refuses to start with an empty `COMMISSION_QUOTE_API_KEY` (E13), so E8 is covered by the API client's unit tests rather than by the mock.

The mock returns **pre-configured JSON only**. It doesn't calculate anything, so each risk band always returns the same quote from its fixture, whatever loan amount or term is entered (e.g. MEDIUM is always `Q-MED-0001`, `0.015`, `3750`).

### Scenarios

Rules live in `scenarios.json` and are checked in order:

| #   | Request                                                                                                                    | Response                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | `api-key` header missing or empty (E8)                                                                                     | `401` `unauthorized.json`                                                                                   |
| 2   | `loanAmount` equals `13` (`forceError` in `scenarios.json`)                                                                | **One error picked at random** from the error pool below. A deterministic way to get _an_ error, for demos. |
| 3   | **Any other request, at random**, with probability `ERROR_RATE` (`0.2`, i.e. about 1 in 5)                                 | **One error picked at random** from the error pool below                                                    |
| 4   | `riskBand` = `LOW`                                                                                                         | `201` `quote-low.json`, `totalCommission` = `loanAmount` × `0.01`                                           |
| 5   | `riskBand` = `MEDIUM`                                                                                                      | `201` `quote-medium.json`, `totalCommission` = `loanAmount` × `0.015`                                       |
| 6   | `riskBand` = `HIGH`                                                                                                        | `201` `quote-high.json`, `totalCommission` = `loanAmount` × `0.02`                                          |
| 7   | Anything else: body isn't JSON, matches no response (e.g. `riskBand` = `EXTREME`), or `loanAmount` isn't a positive number | `422` `validation-error.json` (`fallback`)                                                                  |

A request whose method and path match no route gets `404`.

`scenarios.json` declares everything, so `server.mjs` holds no API-specific logic:

```json
{
  "routes": [
    {
      "method": "POST",
      "path": "/commission-quotes",
      "auth": { "header": "api-key", "status": 401, "fixture": "unauthorized.json" },
      "forceError": { "field": "loanAmount", "equals": 13 },
      "errorPool": [
        { "name": "server-error", "status": 500, "fixture": "server-error.json" },
        { "name": "timeout", "behaviour": "timeout" },
        "…"
      ],
      "responses": [
        { "when": { "riskBand": "LOW" }, "status": 201, "fixture": "quote-low.json" },
        "…"
      ],
      "fallback": { "status": 422, "fixture": "validation-error.json" }
    }
  ]
}
```

Fixtures are read from disk on every request, so edits apply without restarting the mock.

Rule 3 is the real simulation of network conditions. Any valid request can fail without warning, as a real vendor API might. Rule 2 exists only so that error handling can be shown on demand.

**Error pool** (listed in `scenarios.json`, so it can be changed without code):

| Error               | Response                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Request rejected    | `422` `validation-error.json`                                                            |
| Server error        | `500` `server-error.json`                                                                |
| Service unavailable | `503` `service-unavailable.json`                                                         |
| Unexpected response | `201` `invalid-quote.json` (body doesn't match `CommissionQuote`)                        |
| Timeout             | No reply for `TIMEOUT_DELAY_MS` (`10000`), longer than the app's timeout                 |
| Connection dropped  | The mock closes the socket without replying, so the app route sees a network error (E19) |

- The mock prints the error it picked and why to its terminal, e.g. `[mock] random failure (rate 0.2) → 503 service-unavailable` or `[mock] forced (loanAmount 13) → 422 validation-error`, so you can see what happened behind the generic message.
- Because the browser only ever shows the generic error for a hop 2 failure, _which_ error is picked never changes what a user sees. Tests that need one specific error stub `fetch` in unit tests instead (see below).

Fixture values (returned as they are, whatever the loan amount):

| Fixture             | `quoteId`     | `commissionRate` | `totalCommission` |
| ------------------- | ------------- | ---------------- | ----------------- |
| `quote-low.json`    | `Q-LOW-0001`  | `0.01`           | `2500`            |
| `quote-medium.json` | `Q-MED-0001`  | `0.015`          | `3750`            |
| `quote-high.json`   | `Q-HIGH-0001` | `0.02`           | `5000`            |

The mock keeps no state between requests.

**Adding an error:** add a JSON file to `fixtures/` and an entry to the error pool in `scenarios.json`. No code change is needed. Fixtures aren't tested on their own: the API client checks every `201` reply against `CommissionQuote` at runtime, so a quote fixture that drifts from the model shows up as a failing e2e happy path.

In unit tests, `fetch` is replaced with `vi.fn()`, and each test returns exactly the response it needs (no randomness), so every error kind is tested deterministically. MSW isn't used: for one endpoint, stubbing `fetch` needs no extra library.

The mock only covers hop 2. Hop 1 errors (E12, E15–E18) can't come from the mock, because they happen between the browser and our own app route. They are tested by stubbing `fetch` in unit and browser tests (see section 10).

## 9. Files

```
src/
├── instrumentation.ts                             # loads instrumentation-node.ts on Node.js only
├── instrumentation-node.ts                        # startup check: exits if the API config is invalid (E13)
├── app/
│   ├── page.tsx                                   # renders the form
│   ├── page.e2e.ts
│   └── api/commission-quotes/
│       ├── route.ts
│       └── route.test.ts
├── features/commission-quote/
│   ├── model.ts · model.test.ts
│   ├── generate-quote/
│   │   ├── request-commission-quote.ts · .test.ts               # hop 1 call to the app route (browser-only)
│   │   ├── commission-quote-form.tsx · .browser.test.tsx
│   │   └── commission-quote-result.tsx · .browser.test.tsx
│   └── vendor/
│       ├── commission-quote-api-config.ts · .test.ts
│       └── commission-quote-api-client.ts · .test.ts
└── shared/
    └── lib/       format.ts · format.test.ts, api-response.ts · api-response.test.ts
mock-api/
├── server.mjs                # serves each <name>-api/ folder under /<name>-api
└── commission-quote-api/
    ├── scenarios.json        # routes: auth, forceError, errorPool, responses, fallback
    └── fixtures/             # quote-low|medium|high, unauthorized, validation-error,
                              # server-error, service-unavailable, invalid-quote
                              # (timeout and connection-dropped are rules, not files)
```

## 10. Tests

| Layer              | File                                       | Covers                                                                                                                                                                                                                                                                                                                                                                                                                   | Scenarios                         |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| Model              | `model.test.ts`                            | Each field required; amount > 0, ≤ 100,000,000 and at most 2 decimals (`0.29` and `0.1 + 0.2` accepted, `0.001` and `1e300` rejected); term is a whole number from 1 to 600; risk band limited to the three values                                                                                                                                                                                                       | E1–E4, E20, E21 rules             |
| Config             | `commission-quote-api-config.test.ts`      | Missing or invalid values throw one error naming every bad variable (never a value); timeout default applied; timeout `9000` accepted, `9001` and `15000` rejected                                                                                                                                                                                                                                                       | E13                               |
| API client (hop 2) | `commission-quote-api-client.test.ts`      | Sends `api-key`; returns the quote for a valid 201 without logging; 401, 422, 5xx, non-JSON or invalid 201, unexpected status, timeout and network error each return `null` **and log their own reason**; never logs the API key; never throws                                                                                                                                                                           | S1, E7–E11, E19                   |
| App route          | `route.test.ts`                            | a quote → `201`; invalid, non-JSON or non-object body → `400` without calling the client, only contract fields passed to it; the client returning `null` → `502` with the generic body; a thrown exception → `500` `fail`; no upstream detail or stack trace in any body                                                                                                                                                 | E6–E11, E16, E19                  |
| Request (hop 1)    | `request-commission-quote.test.ts`         | Returns `{ status, data }`: success passes the quote through; a route `fail` (400/500/502) passes through with its message; HTML, non-JSON, a bare quote or `success` without a quote → generic `fail`; network error and (fake-timer) timeout → generic `fail`; each failure logs its reason, a successful quote and an unmount log nothing; unmount wins when both fired; timer cleared after a response; never throws | E6, E12, E15–E18                  |
| Formatting         | `format.test.ts`                           | `0.015` → `1.50%`; `3750` → `$3,750.00`                                                                                                                                                                                                                                                                                                                                                                                  | S1                                |
| Form (browser)     | `commission-quote-form.browser.test.tsx`   | Generate stays enabled; clicking it with missing or invalid input shows every error, focuses the first and sends nothing; no errors before the first click; errors clear as values become valid; no double submit; every failure kind shows the generic error; no message after unmount; alert cleared on retry; any field change clears the shown quote; new result replaces old                                        | S3, E1–E5, E12, E14–E18, E20, E21 |
| Result (browser)   | `commission-quote-result.browser.test.tsx` | Shows quote ID, formatted rate and total                                                                                                                                                                                                                                                                                                                                                                                 | S1                                |
| End to end         | `page.e2e.ts`                              | **One happy path only**: fill in the form, click Generate, see a quote. Every other scenario is covered by the unit and browser tests above                                                                                                                                                                                                                                                                              | S1                                |

Playwright starts the mock and the app (production build) itself. Because the mock fails about 1 in 5 requests at random, Playwright retries a failed test up to 2 times. The chance that the happy path fails three times in a row by bad luck is under 1%.

## 11. Out of scope

- Login (see the extension points in doc 01).
- Quote approval. Planned location: `src/features/commission-quote/approve-quote/` (button + browser action); app route `src/app/api/commission-quotes/[quoteId]/approval/route.ts`; a new function in the existing API client; new fixtures and rules in `mock-api/commission-quote-api/`.
- Storing quotes in this app. The quote exists only in the Commission Quote API and on screen.
- Calculating commission locally. The Commission Quote API is the source of truth.
