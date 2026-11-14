import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { postCommissionQuote } from './commission-quote-api-client'

const config = { baseUrl: 'https://vendor.test/api', apiKey: 'secret-key', timeoutMs: 5000 }
const request = { loanAmount: 250000, loanTermInMonths: 360, riskBand: 'MEDIUM' as const }
const quote = { quoteId: 'Q-MED-0001', commissionRate: 0.015, totalCommission: 3750 }

let log: MockInstance<typeof console.error>

/** Makes the vendor answer with this status and body (a string is sent as is). */
function vendorReplies(status: number, body: unknown) {
  const fetchMock = vi.fn(
    async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Makes the vendor call fail before any response, the way fetch does. */
function vendorFails(error: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw error
    }),
  )
}

beforeEach(() => {
  log = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('postCommissionQuote', () => {
  it('posts the request with the x-api-key header to {baseUrl}/commission-quotes', async () => {
    const fetchMock = vendorReplies(201, quote)
    await postCommissionQuote(request, config)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://vendor.test/api/commission-quotes')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'x-api-key': 'secret-key' })
    expect(JSON.parse(init.body as string)).toEqual(request)
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('uses the config from the environment when none is passed', async () => {
    vi.stubEnv('COMMISSION_QUOTE_API_BASE_URL', 'https://env-vendor.test/v1/')
    vi.stubEnv('COMMISSION_QUOTE_API_KEY', 'env-key')
    const fetchMock = vendorReplies(201, quote)
    await postCommissionQuote(request)

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://env-vendor.test/v1/commission-quotes')
    expect(init.headers).toMatchObject({ 'x-api-key': 'env-key' })
  })

  it('returns the quote for a 201, without logging (S1)', async () => {
    vendorReplies(201, quote)
    expect(await postCommissionQuote(request, config)).toEqual(quote)
    expect(log).not.toHaveBeenCalled()
  })

  // Every failure returns null; only the log says what went wrong.
  it.each([
    [
      '401 (E8)',
      401,
      { code: 'UNAUTHORIZED', message: 'Missing or invalid API key' },
      'rejected the API key (401 UNAUTHORIZED: Missing or invalid API key)',
    ],
    [
      '422 (E7)',
      422,
      { code: 'VALIDATION_ERROR', message: 'loanAmount is not acceptable' },
      'rejected the request (422 VALIDATION_ERROR: loanAmount is not acceptable)',
    ],
    [
      '503 (E9)',
      503,
      { code: 'SERVICE_UNAVAILABLE', message: 'down' },
      'failed (503 SERVICE_UNAVAILABLE: down)',
    ],
    ['500 without an error body (E9)', 500, 'oops', 'failed (500 no error body)'],
    [
      'a 201 that is not JSON (E10)',
      201,
      '<html>oops</html>',
      'returned a 201 that is not a CommissionQuote',
    ],
    [
      'a 201 that is not a quote (E10)',
      201,
      { quoteId: 'Q-1', commissionRate: '1.5%' },
      'returned a 201 that is not a CommissionQuote',
    ],
    ['an unexpected status (E10)', 404, { code: 'NOT_FOUND' }, 'returned an unexpected status 404'],
    ['200 instead of 201 (E10)', 200, quote, 'returned an unexpected status 200'],
  ])('returns null for %s and logs why', async (_label, status, body, reason) => {
    vendorReplies(status, body)
    expect(await postCommissionQuote(request, config)).toBeNull()
    expect(log).toHaveBeenCalledWith(`[commission-quote] Commission Quote API ${reason}`)
  })

  it('returns null for a timeout and logs it (E11)', async () => {
    vendorFails(new DOMException('The operation timed out.', 'TimeoutError'))
    expect(await postCommissionQuote(request, config)).toBeNull()
    expect(log).toHaveBeenCalledWith(
      '[commission-quote] Commission Quote API timed out after 5000 ms',
    )
  })

  it('returns null for a network error and logs it (E19)', async () => {
    vendorFails(new TypeError('fetch failed', { cause: new Error('connect ECONNREFUSED') }))
    expect(await postCommissionQuote(request, config)).toBeNull()
    expect(log).toHaveBeenCalledWith(
      '[commission-quote] Commission Quote API unreachable: fetch failed (connect ECONNREFUSED)',
    )
  })

  it('never logs the API key', async () => {
    vendorReplies(401, { code: 'UNAUTHORIZED', message: 'Missing or invalid API key' })
    await postCommissionQuote(request, config)
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret-key')
  })

  it('never throws, even for a non-Error rejection', async () => {
    vendorFails('something odd')
    await expect(postCommissionQuote(request, config)).resolves.toBeNull()
  })
})
