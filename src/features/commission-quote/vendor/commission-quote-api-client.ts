import 'server-only'
import { parseJson } from '@/shared/lib/parse-json'
import {
  commissionQuoteApiErrorSchema,
  commissionQuoteSchema,
  type CommissionQuote,
  type CommissionQuoteRequest,
} from '../model'
import {
  readCommissionQuoteApiConfig,
  type CommissionQuoteApiConfig,
} from './commission-quote-api-config'

// Calls the third-party Commission Quote API (doc 02, section 5). Server-only: it sends the API
// key. It never throws.

/**
 * Returns the quote, or `null` when it's unavailable (E7–E11, E19). In that case the specific
 * reason has already been logged on the server.
 *
 * `config` defaults to the settings from the environment (checked at startup); tests can pass
 * their own.
 */
export async function postCommissionQuote(
  request: CommissionQuoteRequest,
  config: CommissionQuoteApiConfig = readCommissionQuoteApiConfig(),
): Promise<CommissionQuote | null> {
  let status: number
  let text: string
  try {
    const response = await fetch(`${config.baseUrl}/commission-quotes`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify(request),
      // Covers waiting for the response and reading its body.
      signal: AbortSignal.timeout(config.timeoutMs),
      cache: 'no-store',
    })
    status = response.status
    text = await response.text()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return unavailable(`timed out after ${config.timeoutMs} ms`) // E11
    }
    return unavailable(`unreachable: ${describe(error)}`) // E19
  }

  const body = parseJson(text)

  if (status === 201) {
    const quote = commissionQuoteSchema.safeParse(body)
    if (quote.success) return quote.data
    return unavailable('returned a 201 that is not a CommissionQuote') // E10
  }
  if (status === 401) return unavailable(`rejected the API key (401 ${apiError(body)})`) // E8
  if (status === 422) return unavailable(`rejected the request (422 ${apiError(body)})`) // E7
  if (status >= 500) return unavailable(`failed (${status} ${apiError(body)})`) // E9
  return unavailable(`returned an unexpected status ${status}`) // E10
}

/** Logs why the call failed (server only, never sent to the browser) and returns null. */
function unavailable(reason: string): null {
  console.error(`[commission-quote] Commission Quote API ${reason}`)
  return null
}

/** The vendor's `code: message`, if the body is a CommissionQuoteApiError. */
function apiError(body: unknown): string {
  const parsed = commissionQuoteApiErrorSchema.safeParse(body)
  return parsed.success ? `${parsed.data.code}: ${parsed.data.message}` : 'no error body'
}

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const cause = error.cause instanceof Error ? ` (${error.cause.message})` : ''
  return `${error.message}${cause}`
}
