import { afterEach, describe, expect, it, vi } from 'vitest'
import { postCommissionQuote } from '@/features/commission-quote/vendor/commission-quote-api-client'
import { POST } from './route'

// The vendor call has its own tests (commission-quote-api-client.test.ts), so the client is
// replaced here. These tests cover validation and the mapping to HTTP.
vi.mock('@/features/commission-quote/vendor/commission-quote-api-client', () => ({
  postCommissionQuote: vi.fn(),
}))
const client = vi.mocked(postCommissionQuote)

const valid = { loanAmount: 250000, loanTermInMonths: 360, riskBand: 'MEDIUM' }
const quote = { quoteId: 'Q-MED-0001', commissionRate: 0.015, totalCommission: 3750 }
const GENERIC = "We couldn't generate a quote right now. Please try again."

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/commission-quotes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )
}

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('POST /api/commission-quotes', () => {
  it('returns 201 with the quote, calling the client with the request', async () => {
    client.mockResolvedValue(quote)
    const response = await post(valid)

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ status: 'success', data: quote })
    expect(client).toHaveBeenCalledWith(valid)
  })

  it('passes only the contract fields to the client', async () => {
    client.mockResolvedValue(quote)
    await post({ ...valid, extra: 'ignored' })
    expect(client.mock.calls[0]?.[0]).toEqual(valid)
  })

  it('returns a 400 fail with field issues, without calling the client (E6)', async () => {
    const response = await post({ ...valid, loanAmount: 0, riskBand: 'EXTREME' })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      status: 'fail',
      data: {
        message: "Some loan details aren't valid. Please check them and try again.",
        issues: {
          loanAmount: ['Enter a loan amount greater than 0'],
          riskBand: ['Select a risk band'],
        },
      },
    })
    expect(client).not.toHaveBeenCalled()
  })

  it.each([
    ['a non-JSON body', 'not json'],
    ['a JSON body that is not an object', '"just a string"'],
  ])('returns 400 for %s, without calling the client', async (_label, body) => {
    const response = await post(body)
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      status: 'fail',
      data: { message: expect.any(String) },
    })
    expect(client).not.toHaveBeenCalled()
  })

  it('returns a 502 fail with the generic message when the client returns null (E7–E11, E19)', async () => {
    client.mockResolvedValue(null)
    const response = await post(valid)

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ status: 'fail', data: { message: GENERIC } })
  })

  it('returns a 500 fail, with no stack trace, when something throws (E16)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    client.mockRejectedValue(new Error('kaboom at secret/path.ts:12'))
    const response = await post(valid)

    expect(response.status).toBe(500)
    const text = await response.text()
    expect(JSON.parse(text)).toEqual({ status: 'fail', data: { message: GENERIC } })
    expect(text).not.toContain('kaboom')
  })
})
