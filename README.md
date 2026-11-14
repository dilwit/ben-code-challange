# Commission Quote App

A Next.js app for generating commission quotes. Enter a loan amount, a loan term and a risk band;
the app asks the Commission Quote API for a quote and shows the quote ID, commission rate and total commission.
For local development it runs against a bundled mock Commission Quote API.

## Prerequisites

- Node.js 22 or later
- pnpm 10 (`corepack enable` installs it using the version pinned in `package.json`)

## Run locally

```bash
git clone <repo-url>
cd ben-code-challange
corepack enable
pnpm install
cp .env.example .env.local      # local API URL + key, already set for the mock API
pnpm dev                        # starts the mock API (port 4010) and the app (port 3000)
```

Open http://localhost:3000.

## Try it out

| Input | Result |
|---|---|
| Any valid loan amount (e.g. `250000`), term and risk band `LOW` / `MEDIUM` / `HIGH` | A quote for that band most of the time. About 1 in 5 requests fail at random (`MOCK_ERROR_RATE`, default `0.2`) to simulate an unreliable vendor |
| Loan amount `13` | Always an API error, picked at random: rejected request, server error, service unavailable, unexpected response, timeout or connection dropped |
| Wrong `COMMISSION_QUOTE_API_KEY` in `.env.local` (restart needed) | API rejects the key |
| Amount `0`, `0.001` or above `100000000`; term `0`, `1.5` or above `600` | A field error; **Generate** stays disabled |

The **Generate** button stays disabled until all three fields are **valid**, not just filled in.

What the browser shows:

- **Field errors** for invalid input, under the field.
- **The same generic error** for every failure once the request is sent: vendor API failures, server-side problems, a lost connection, or no answer from the app's server within 10 seconds. The terminal running `pnpm dev` shows which error the mock picked and why; the browser console shows the cause of browser-side failures.

Mock responses live in `mock-api/commission-quote-api/fixtures/`. Edit them, or `scenarios.json`, to change what the mock returns. Set `MOCK_ERROR_RATE=0` to turn random failures off, or `1` to make every request fail.

## Configuration (`.env.local`)

| Variable | Purpose | Local default |
|---|---|---|
| `COMMISSION_QUOTE_API_BASE_URL` | Commission Quote API base URL | `http://localhost:4010/commission-quote-api` |
| `COMMISSION_QUOTE_API_KEY` | API key sent as `x-api-key` | `local-dev-key` |
| `COMMISSION_QUOTE_API_TIMEOUT_MS` | Server-to-API timeout, 1–9000 ms (must stay under the browser's 10 s) | `5000` |

These are read only on the server and never sent to the browser. Never commit `.env.local`.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run the mock API (4010) and the app (3000) together |
| `pnpm mock` | Run the mock API on its own (e.g. alongside `pnpm start`) |
| `pnpm build` | Build for production (also type-checks) |
| `pnpm start` | Run the production build |
| `pnpm test` | Unit and component tests (Vitest) |
| `pnpm test:e2e` | End-to-end tests (Playwright; starts the mock API and the app itself) |

Before running tests the first time: `pnpm exec playwright install chromium`.

## Tests

Tests sit next to the code they test:

- `*.test.ts`: unit tests (Vitest, Node)
- `*.browser.test.tsx`: component tests (Vitest browser mode, Chromium)
- `*.e2e.ts`: end-to-end tests (Playwright)

## Documentation

- [Project structure and tech stack](docs/architecture/01-project-structure-and-tech-stack.md)
- [Feature: Generate Commission Quote](docs/architecture/02-commission-quote-feature.md)
