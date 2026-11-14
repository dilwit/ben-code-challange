import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { GENERATE_QUOTE_REQUEST_TIMEOUT_MS } from '../model'
import { generateCommissionQuoteAction } from './generate-commission-quote-action'

const request = { loanAmount: 250000, loanTermInMonths: 360, riskBand: 'MEDIUM' as const }
const quote = { quoteId: 'Q-MED-0001', commissionRate: 0.015, totalCommission: 3750 }
const GENERIC = "We couldn't generate a quote right now. Please try again."
const GENERIC_FAIL = { status: 'fail', data: { message: GENERIC } }

let log: MockInstance<typeof console.error>

function serverReplies(status: number, body: unknown) {
  const fetchMock = vi.fn(
    async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/**
 * A server that never answers: like the real fetch, it rejects only when its signal aborts
 * (straight away if already aborted). `rejectDelayMs` delays the rejection, so a test can abort
 * a second signal before the action's catch runs.
 */
function serverHangs({ rejectDelayMs }: { rejectDelayMs?: number } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init.signal!
          const fail = () =>
            rejectDelayMs === undefined
              ? reject(signal.reason)
              : setTimeout(() => reject(signal.reason), rejectDelayMs)
          if (signal.aborted) fail()
          else signal.addEventListener('abort', fail)
        }),
    ),
  )
}

const call = (signal = new AbortController().signal) =>
  generateCommissionQuoteAction(request, { signal })

beforeEach(() => {
  log = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('generateCommissionQuoteAction', () => {
  it('posts the request as JSON to /api/commission-quotes', async () => {
    const fetchMock = serverReplies(201, { status: 'success', data: quote })
    await call()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/commission-quotes')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual(request)
  })

  it('returns the success response with the quote, without logging', async () => {
    serverReplies(201, { status: 'success', data: quote })
    expect(await call()).toEqual({ status: 'success', data: quote })
    expect(log).not.toHaveBeenCalled()
  })

  it.each([
    [502, GENERIC],
    [500, GENERIC],
    // A 400 only happens if the form and server rules are out of step.
    [400, "Some loan details aren't valid. Please check them and try again."],
  ])(
    "passes a %s fail through with the route's message, and logs it (E6–E11, E16, E19)",
    async (httpStatus, message) => {
      serverReplies(httpStatus, { status: 'fail', data: { message, issues: { x: ['y'] } } })
      expect(await call()).toEqual({ status: 'fail', data: { message } })
      expect(log).toHaveBeenCalledWith(`Commission quote request failed: ${httpStatus} ${message}`)
    },
  )

  it.each([
    [
      'an HTML error page',
      500,
      '<html>Internal Server Error</html>',
      '500 reply is not a valid { status, data }',
    ],
    [
      'an HTML 404 page',
      404,
      '<html>Not found</html>',
      '404 reply is not a valid { status, data }',
    ],
    ['a body that is not JSON', 201, 'oops', '201 reply is not a valid { status, data }'],
    ['a bare quote, not { status, data }', 201, quote, '201 reply is not a valid { status, data }'],
    [
      'success without a valid quote',
      201,
      { status: 'success', data: { quoteId: 'Q-1' } },
      '201 reply is not a valid { status, data }',
    ],
    [
      'a fail without a message',
      502,
      { status: 'fail', data: {} },
      '502 reply is not a valid { status, data }',
    ],
  ])('returns the generic fail for %s and logs why (E17)', async (_label, status, body, reason) => {
    serverReplies(status, body)
    expect(await call()).toEqual(GENERIC_FAIL)
    expect(log).toHaveBeenCalledWith(`Commission quote request failed: ${reason}`)
  })

  it('returns the generic fail for a network error and logs it (E12)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    expect(await call()).toEqual(GENERIC_FAIL)
    expect(log).toHaveBeenCalledWith(
      'Commission quote request failed: network error: Failed to fetch',
    )
  })

  it('returns the generic fail when the timer fires and logs it (E15)', async () => {
    vi.useFakeTimers()
    serverHangs()
    const pending = call()
    await vi.advanceTimersByTimeAsync(GENERATE_QUOTE_REQUEST_TIMEOUT_MS)
    expect(await pending).toEqual(GENERIC_FAIL)
    expect(log).toHaveBeenCalledWith('Commission quote request failed: no answer within 10000 ms')
  })

  it('logs nothing when the unmount signal is aborted (E18)', async () => {
    serverHangs()
    const unmount = new AbortController()
    const pending = call(unmount.signal)
    unmount.abort()
    expect(await pending).toEqual(GENERIC_FAIL)
    expect(log).not.toHaveBeenCalled()
  })

  it('logs nothing when both signals have fired: unmount wins (E18)', async () => {
    vi.useFakeTimers()
    serverHangs({ rejectDelayMs: 1 }) // fetch rejects 1 ms after its signal aborts
    const unmount = new AbortController()
    const pending = call(unmount.signal)

    await vi.advanceTimersByTimeAsync(GENERATE_QUOTE_REQUEST_TIMEOUT_MS) // the timeout fires…
    unmount.abort() // …then the user leaves, before fetch has rejected
    await vi.advanceTimersByTimeAsync(1)

    expect(await pending).toEqual(GENERIC_FAIL)
    expect(log).not.toHaveBeenCalled()
  })

  it('clears the timer after a response', async () => {
    vi.useFakeTimers()
    serverReplies(201, { status: 'success', data: quote })
    await call()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('never throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw 'not even an Error'
      }),
    )
    await expect(call()).resolves.toEqual(GENERIC_FAIL)
  })
})
