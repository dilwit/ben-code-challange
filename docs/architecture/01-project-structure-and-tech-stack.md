# 01: Project Structure and Tech Stack

## 1. Purpose

This is the **base app** for staff tools on the lending platform. This doc covers the structure, tech stack and conventions that every feature follows. Each feature has its own design doc:

- [02: Generate Commission Quote](02-commission-quote-feature.md)

The app runs locally only, with no Docker. Third-party APIs that aren't available yet are replaced by a bundled mock API.

The structure is designed to grow. New features are added as new folders, without moving existing code.

## 2. High-level flow

Every feature that calls a third-party API follows the same path:

```
Browser
  │  page (Server Component) renders the feature's UI (Client Components)
  │  the UI calls a small browser action that fetches the app route
  ▼
Next.js app route   POST /api/<resource>             src/app/api/<resource>/route.ts
  │  JSON in → validate with the feature's model → call the API client → HTTP status out
  ▼
API client                                           src/features/<feature>/vendor/
  │  auth header, timeout; URL and key from .env.local (server only)
  ▼
Third-party API   (real vendor)  or  mock-api (localhost:4010/<name>-api, JSON fixtures)
```

Each feature's data model (Zod schemas in its `model.ts`) is used at every step: the UI, the app route and the API client.

## 3. Project structure

```
.
├── docs/architecture/          # this file + one design doc per feature
├── mock-api/                   # local stand-in for third-party APIs
│   ├── server.mjs              # one server for all mocked APIs
│   └── <name>-api/             # scenarios.json + fixtures/*.json, served under /<name>-api
├── src/
│   ├── app/                    # Next.js routing only: pages, layouts, app routes
│   ├── features/               # one folder per business capability
│   │   └── <feature>/
│   │       ├── model.ts        # the feature's data model (Zod schemas + types)
│   │       ├── <use-case>/     # its UI + the browser action that calls the app route
│   │       └── vendor/         # third-party API client + config (not the app route under app/api)
│   └── shared/                 # generic building blocks, no business logic
│       └── lib/                # formatting ($, %), API response helpers ({ status, data })
├── .env.example                # committed: which settings exist
└── .env.local                  # not committed: local URLs and API keys
```

Each feature doc lists its own files.

### What each folder owns

| Folder | Owns | Must not |
|---|---|---|
| `src/app/` | URLs, pages, layouts, app routes | Hold business rules (they live in the feature's `model.ts`) |
| `src/features/<name>/` | Model, UI, browser actions and API client for one capability | Depend on another feature's UI or API client |
| `src/shared/` | Generic helpers: formatting, the API response shape | Import from `features/` |
| `mock-api/` | Pre-configured JSON responses per external API | Hold real logic or validation |

### Dependency rules

```
app  ──▶  features  ──▶  shared
```

- Files are imported **directly by path**, e.g. `@/features/<feature>/<use-case>/<file>`. There are no barrel files (`index.ts`) and no `server.ts` entry points. Every import shows exactly where the code lives, and there is no extra layer to keep in sync.
- Every file that runs only on the server starts with `import 'server-only'`. The build fails if client code imports it, directly or indirectly. **This is the client/server boundary**, and it keeps API keys off the browser.
- If two features need the same thing, it moves to `shared/`, or the second feature imports the first feature's `model.ts`. A feature never imports another feature's UI or API client.
- Tests sit next to the code they test. The file suffix picks the runner:

| Suffix | Runner | Runs in |
|---|---|---|
| `*.test.ts` | Vitest | Node |
| `*.browser.test.tsx` | Vitest browser mode | Real Chromium |
| `*.e2e.ts` | Playwright | Real app + mock API |

## 4. Tech stack and why

| Choice | Why |
|---|---|
| **Next.js (App Router)** | Server and client components in one app. App routes run on the server, so third-party API keys never reach the browser. |
| **TypeScript** | Type safety from the form to the API client. Catches contract mismatches at build time. |
| **Tailwind CSS v4** | Quick, consistent styling, with no separate CSS layer to maintain. |
| **React Hook Form** | Form state, touched fields and errors, with the Zod schema plugged in through `@hookform/resolvers`, so the form and the server share one set of rules. |
| **Zod** | One schema gives both the TypeScript types and runtime validation. Used at every boundary: form input, app route request, and the replies from the app route and the third-party API. Environment config is the exception: a few strings checked in one place, so plain code is simpler there. |
| **pnpm** | Fast installs and strict dependency resolution (no accidental use of undeclared packages). |
| **Vitest** | Fast unit tests. **Browser mode** runs component tests in a real browser instead of a simulated DOM (jsdom), so what's tested is what users get. |
| **Playwright** | End-to-end tests against the running app and mock API. It also powers Vitest browser mode, so there's one browser toolchain. |
| **Stubbed `fetch` (`vi.fn`)** | Unit tests replace `fetch` to return exact HTTP responses, so every success and error path is tested without a network or extra library. |
| **Mock API on Node's `node:http`** | No dependencies. Scenarios are plain JSON files, so anyone can add or change a response without writing code. |

## 5. Key decisions

| Decision | Chosen | Why |
|---|---|---|
| How the UI sends data | **App routes** rather than Server Actions | Gives a clear HTTP contract that's easy to test, and other clients can call it later. |
| Folder organisation | **By feature** | New features are added as folders; existing code doesn't move. |
| Repository shape | **Single package**, not a monorepo | Only one app consumes the models. The mock is just fixtures, so separate packages would add tooling with no benefit. |
| Containers | **No Docker** | Local-only use; `pnpm dev` is enough. Docker can be added later without structural change. |
| Mock server | **Fixtures only**, one path prefix per API | Its job is to return known success and error responses. If a fixture drifts from the model, the API client's runtime check rejects it and the e2e happy path fails. |
| Mock behaviour | **Per API, in its `scenarios.json`, with no state** | No state, so parallel e2e tests can't interfere. Each feature doc describes its own mock scenarios and simulated failures. |
| Configuration | **`.env.local`, server-only** | URLs and API keys stay on the developer's machine and out of the browser bundle. `.env.example` documents what's needed. |
| Config errors | **Checked once at startup** (`src/instrumentation.ts` → `instrumentation-node.ts`); the server exits if anything is invalid | A bad deploy fails immediately and loudly, not on a user's first request, and a broken server can't look healthy. |
| Business logic placement | **Rules in the feature's `model.ts`; the app route validates with it and calls the API client directly** | One step doesn't need a separate use-case layer: form → action → route → client is as short as it can be while keeping the API key on the server. If quoting gains real rules (saving, auditing, a second service), add a feature service between the route and the client then. |

## 6. Extension points

These are planned locations only. Nothing here is built yet.

| Future addition | Where it goes |
|---|---|
| **A new feature** | `src/features/<feature>/` for its model, UI, browser actions and API client; its pages and app routes in `src/app/`; a design doc in `docs/architecture/NN-<feature>.md`, linked from section 1. |
| **Login** | `src/features/auth/` (model, login, session, API client); pages in `src/app/(public)/login/`; an `src/app/(protected)/` layout that checks the session; `src/proxy.ts` for request-level checks. Route groups don't change URLs, so existing pages simply move into `(protected)`. |
| **Another third-party API** | `src/features/<name>/vendor/` for the client and `mock-api/<name>-api/` for its fixtures. The mock server serves each `<name>-api/` folder under its own path prefix, `/<name>-api`, on the shared port 4010. That way two vendors with the same route (e.g. both exposing `/quotes`) can't collide. Each client's base URL includes its prefix, e.g. `http://localhost:4010/<name>-api`, so each base URL is set on its own and pointing one vendor at the real API doesn't affect the others. A request whose first path segment matches no folder gets `404`. |
