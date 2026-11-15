# Commission Quote App

A Next.js app for generating commission quotes. Enter a loan amount, a loan term and a risk band;
the app asks the Commission Quote API for a quote and shows the quote ID, commission rate and total commission.
For local development it runs against a bundled mock Commission Quote API.

## Prerequisites

- Node.js 22 (LTS); developed and tested on 22.14
- pnpm 10 (`corepack enable` installs it using the version pinned in `package.json`)

## Run locally

```bash
git clone https://github.com/dilwit/ben-code-challange.git
cd ben-code-challange
corepack enable                 # answer Y if it asks to download pnpm
pnpm install
cp .env.example .env.local      # local API URL + key, already set for the mock API
pnpm dev                        # starts the mock API (port 4010) and the app (port 3000)
```

Open http://localhost:3000. Ports 3000 and 4010 must be free; if the mock can't start, `pnpm dev` stops both.

## Try it out

| Input                                                                               | Result                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any valid loan amount (e.g. `250000`), term and risk band `LOW` / `MEDIUM` / `HIGH` | A quote for that band most of the time. The mock returns a fixed quote per band, whatever the loan amount or term (LOW $2,500 at 1%, MEDIUM $3,750 at 1.5%, HIGH $5,000 at 2%). About 1 in 5 requests fail at random (`ERROR_RATE` in `mock-api/server.mjs`) to simulate an unreliable vendor |
| Loan amount `13`                                                                    | Always an API error, picked at random: rejected request, server error, service unavailable, unexpected response, timeout or connection dropped                                                                                                                                                |
| Empty `COMMISSION_QUOTE_API_KEY` in `.env.local`                                    | The app **refuses to start** and lists every invalid setting (never its value). `pnpm dev` stops the mock too                                                                                                                                                                                 |
| Amount `0`, `0.001` or above `100000000`; term `0`, `1.5` or above `600`            | Clicking **Generate Quote** shows the field error and sends nothing                                                                                                                                                                                                                           |

**Generate Quote** is always clickable (except while a quote is being generated). If anything is missing or invalid, clicking it shows every field's error and moves focus to the first one; nothing is sent until all three are valid.

What the browser shows:

- **Field errors** for invalid input, under the field.
- **The same generic error** for every failure once the request is sent: vendor API failures, server-side problems, a lost connection, or no answer from the app's server within 10 seconds. The terminal running `pnpm dev` shows which error the mock picked and why; the browser console shows the cause of browser-side failures.

Mock responses live in `mock-api/commission-quote-api/fixtures/`. Edit them, or `scenarios.json`, to change what the mock returns. Each band's quote is the fixed content of its `quote-*.json` fixture; the mock doesn't calculate anything. To change how often it fails at random, edit `ERROR_RATE` at the top of `mock-api/server.mjs` (`0` never, `1` always) and restart.

## Configuration (`.env.local`)

| Variable                          | Purpose                                                               | Local default                                |
| --------------------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| `COMMISSION_QUOTE_API_BASE_URL`   | Commission Quote API base URL                                         | `http://localhost:4010/commission-quote-api` |
| `COMMISSION_QUOTE_API_KEY`        | API key sent as `api-key`                                             | `local-dev-key`                              |
| `COMMISSION_QUOTE_API_TIMEOUT_MS` | Server-to-API timeout, 1–9000 ms (must stay under the browser's 10 s) | `5000`                                       |

These are read only on the server and never sent to the browser. Never commit `.env.local`.

## Commands

| Command         | What it does                                                          |
| --------------- | --------------------------------------------------------------------- |
| `pnpm dev`      | Run the mock API (4010) and the app (3000) together                   |
| `pnpm test`     | Unit and component tests (Vitest)                                     |
| `pnpm test:e2e` | End-to-end tests (Playwright; starts the mock API and the app itself) |

Before running tests the first time: `pnpm exec playwright install chromium`.

## Tests

Tests sit next to the code they test:

- `*.test.ts`: unit tests (Vitest, Node)
- `*.browser.test.tsx`: component tests (Vitest browser mode, Chromium)
- `*.e2e.ts`: end-to-end tests (Playwright)

## AI usage

I used **Claude Code** (Anthropic's Claude) as a pair programmer throughout this challenge.

- **Design before code.** I worked through the design and implementation approach with Claude, documenting the outcome in two documents under `docs/architecture/`. These documents reflect an interactive process where we explored different ideas, challenged assumptions, discussed trade-offs and agreed on an approach that best suited the scope.
- **Implementation.** Claude was used to develop the code as part of an AI-assisted engineering approach, working through each layer step by step. I reviewed the implementation at every stage, challenged design decisions, questioned assumptions and simplified things wherever possible. The aim was not just to generate code, but to make sure the final solution was well thought out, maintainable and aligned with the intended design.

## Future improvements

- **Authentication and authorisation.** Require users to log in and keep all app routes, including `POST /api/commission-quotes`, behind the logged-in context.
- **Retries for the vendor integration.** Retry only failures that may succeed on a second attempt (`503`, timeout, dropped connection), never `401` or `422`; use an idempotency key so a retried POST can't create a duplicate quote; and keep the total time, including backoff, under the browser's 10 s timeout.
- **Better logging.** Replace the `console.error` strings with structured logs, and add a request ID that is logged on the server and shown with the generic error so support can trace a failure.
- **More tests.** Make the mock's random error rate configurable so e2e runs are deterministic, add e2e tests for the error paths, and run the browser and e2e tests in Firefox and WebKit (Safari) as well as Chromium.
- **Confirm the business assumptions:**
  - loan amount up to $100,000,000 with at most 2 decimal places; term 1–600 whole months
  - amounts are AUD, shown in `en-AU` format

## Documentation

- [Project structure and tech stack](docs/architecture/01-project-structure-and-tech-stack.md)
- [Feature: Generate Commission Quote](docs/architecture/02-commission-quote-feature.md)
