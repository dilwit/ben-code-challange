import { z } from 'zod'
import { postCommissionQuote } from '@/features/commission-quote/vendor/commission-quote-api-client'
import { commissionQuoteRequestSchema } from '@/features/commission-quote/model'
import { failResponse, successResponse } from '@/shared/lib/api-response'

// POST /api/commission-quotes (doc 02, section 4): validates the body, calls the Commission
// Quote API client and maps the result to an HTTP status. Every answer is { status, data }.
// Upstream details, the API URL, the API key and stack traces stay in the server log.

const GENERIC_MESSAGE = "We couldn't generate a quote right now. Please try again."

export async function POST(request: Request): Promise<Response> {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return failResponse(400, 'The request body must be JSON.')
    }

    // Same rules and messages as the form (model.ts). E6: never call the vendor with bad data.
    // Unknown fields are dropped, so only the contract reaches the vendor.
    const parsed = commissionQuoteRequestSchema.safeParse(body)
    if (!parsed.success) {
      return failResponse(
        400,
        "Some loan details aren't valid. Please check them and try again.",
        z.flattenError(parsed.error).fieldErrors,
      )
    }

    const quote = await postCommissionQuote(parsed.data)
    if (quote) return successResponse(quote, 201)

    // Any third-party failure looks the same to the browser (E7–E11, E19). The client has
    // already logged the specific reason on the server.
    return failResponse(502, GENERIC_MESSAGE)
  } catch (error) {
    // E16: never Next's HTML error page, never a stack trace in the response.
    console.error('[commission-quote] unexpected error', error)
    return failResponse(500, GENERIC_MESSAGE)
  }
}
