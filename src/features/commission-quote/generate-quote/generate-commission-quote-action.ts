import { z } from 'zod'
import type { ApiResponse } from '@/shared/lib/api-response'
import { commissionQuoteSchema, type CommissionQuote, type CommissionQuoteRequest } from '../model'

// Browser side (doc 02, sections 3 and 6): sends the form data to our own app route,
// POST /api/commission-quotes, and returns the same { status, data } shape the route uses.
// Its own failures (timeout, network error, a reply it can't read) become a 'fail' with the
// generic message, and the reason goes to the browser console. It never throws.
//
// Despite the name, this is a plain client-side function calling an HTTP route, not a
// Next.js Server Action ('use server').

/**
 * How long the browser waits for the app route (E15). Exported because the server config works
 * out its own maximum from it: the server must give up before the browser does.
 */
export const GENERATE_QUOTE_REQUEST_TIMEOUT_MS = 10_000

const GENERIC_FAIL = {
  status: 'fail',
  data: { message: "We couldn't generate a quote right now. Please try again." },
} as const

/** What the route may answer. A 'fail' keeps only its message (issues are dropped). */
const routeReplySchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('success'), data: commissionQuoteSchema }),
  z.object({ status: z.literal('fail'), data: z.object({ message: z.string() }) }),
])

export async function generateCommissionQuoteAction(
  request: CommissionQuoteRequest,
  { signal: unmountSignal }: { signal: AbortSignal },
): Promise<ApiResponse<CommissionQuote>> {
  // setTimeout rather than AbortSignal.timeout() so fake timers can drive it in tests.
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), GENERATE_QUOTE_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch('/api/commission-quotes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.any([unmountSignal, timeout.signal]),
    })
    const reply = routeReplySchema.safeParse(parseJson(await response.text()))

    // E17: e.g. an HTML error page, or 'success' without a valid quote.
    if (!reply.success) return failed(`${response.status} reply is not a valid { status, data }`)

    // The route's own fail (E6–E11, E16, E19); its message never contains vendor details.
    if (reply.data.status === 'fail') {
      console.error(
        `Commission quote request failed: ${response.status} ${reply.data.data.message}`,
      )
    }
    return reply.data
  } catch (error) {
    // The user left (E18): nobody will see this, so don't log it. The form checks its own
    // signal and shows nothing.
    if (unmountSignal.aborted) return GENERIC_FAIL
    return failed(
      timeout.signal.aborted
        ? `no answer within ${GENERATE_QUOTE_REQUEST_TIMEOUT_MS} ms` // E15
        : `network error: ${error instanceof Error ? error.message : String(error)}`, // E12
    )
  } finally {
    clearTimeout(timer)
  }
}

/** Logs why the request failed (browser console only) and returns the generic 'fail'. */
function failed(reason: string) {
  console.error(`Commission quote request failed: ${reason}`)
  return GENERIC_FAIL
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
