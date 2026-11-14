import 'server-only'
import { GENERATE_QUOTE_REQUEST_TIMEOUT_MS } from '../model'

// Settings for calling the Commission Quote API (doc 02, section 7). Read only on the server;
// the build fails if client code imports this file. src/instrumentation.ts calls this once at
// startup, so a bad config stops the server before it serves anything.

/** Server → Commission Quote API timeout when COMMISSION_QUOTE_API_TIMEOUT_MS is not set. */
const COMMISSION_QUOTE_API_TIMEOUT_DEFAULT_MS = 5_000

/**
 * Highest allowed COMMISSION_QUOTE_API_TIMEOUT_MS: 1 s under the browser timeout, for the route's
 * own overhead. The server must give up before the browser does (doc 02, timeout budget).
 */
const COMMISSION_QUOTE_API_TIMEOUT_MAX_MS = GENERATE_QUOTE_REQUEST_TIMEOUT_MS - 1_000

export type CommissionQuoteApiConfig = {
  baseUrl: string
  apiKey: string
  timeoutMs: number
}

/**
 * Reads the Commission Quote API settings. Read on every call (cheap), so tests can pass their
 * own env.
 *
 * Throws one error listing every problem, one per line as `"<VARIABLE>: <rule>"`. Every message
 * is a fixed string, never the value, so the API key can't end up in a log.
 */
export function readCommissionQuoteApiConfig(
  env: Record<string, string | undefined> = process.env,
): CommissionQuoteApiConfig {
  const problems: string[] = []

  // Trailing slashes removed, so `${baseUrl}/commission-quotes` never has a double slash.
  const baseUrl = env.COMMISSION_QUOTE_API_BASE_URL?.trim().replace(/\/+$/, '') ?? ''
  if (!/^https?:\/\//i.test(baseUrl) || !URL.canParse(baseUrl)) {
    problems.push('COMMISSION_QUOTE_API_BASE_URL: must be an http(s) URL')
  }

  const apiKey = env.COMMISSION_QUOTE_API_KEY?.trim() ?? ''
  if (!apiKey) {
    problems.push('COMMISSION_QUOTE_API_KEY: must not be empty')
  }

  // Optional: unset or blank means the default. (Number('') would be 0, so check first.)
  const rawTimeout = env.COMMISSION_QUOTE_API_TIMEOUT_MS?.trim()
  const timeoutMs = rawTimeout ? Number(rawTimeout) : COMMISSION_QUOTE_API_TIMEOUT_DEFAULT_MS
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > COMMISSION_QUOTE_API_TIMEOUT_MAX_MS
  ) {
    problems.push(
      `COMMISSION_QUOTE_API_TIMEOUT_MS: must be a whole number from 1 to ${COMMISSION_QUOTE_API_TIMEOUT_MAX_MS}`,
    )
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid Commission Quote API configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`,
    )
  }

  return { baseUrl, apiKey, timeoutMs }
}
