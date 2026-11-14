import { describe, expect, it } from 'vitest'
import {
  commissionQuoteApiErrorSchema,
  commissionQuoteRequestSchema,
  commissionQuoteSchema,
  VALIDATION_MESSAGES,
} from './model'

const valid = { loanAmount: 250000, loanTermInMonths: 360, riskBand: 'MEDIUM' }

/** Parses `valid` with one field replaced and returns the messages for that field. */
function errorsFor(field: keyof typeof valid, value: unknown): string[] {
  const result = commissionQuoteRequestSchema.safeParse({ ...valid, [field]: value })
  if (result.success) return []
  return result.error.issues.filter((issue) => issue.path[0] === field).map((i) => i.message)
}

describe('CommissionQuoteRequest', () => {
  it('accepts a valid request', () => {
    expect(commissionQuoteRequestSchema.parse(valid)).toEqual(valid)
  })

  it('drops unknown fields, so only the contract reaches the vendor', () => {
    const parsed = commissionQuoteRequestSchema.parse({ ...valid, extra: 'x' })
    expect(parsed).not.toHaveProperty('extra')
  })

  it.each(['loanAmount', 'loanTermInMonths', 'riskBand'] as const)('requires %s (E1)', (field) => {
    const withoutField: Record<string, unknown> = { ...valid }
    delete withoutField[field]
    expect(commissionQuoteRequestSchema.safeParse(withoutField).success).toBe(false)
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, '250000', null])(
    'rejects a loan amount of %s (E2)',
    (loanAmount) => {
      expect(errorsFor('loanAmount', loanAmount)).toContain(VALIDATION_MESSAGES.loanAmountInvalid)
    },
  )

  it.each([0.01, 0.29, 0.1 + 0.2, 1234.5, 99_999_999.99, 100_000_000])(
    'accepts a loan amount of %s (E20)',
    (loanAmount) => {
      expect(errorsFor('loanAmount', loanAmount)).toEqual([])
    },
  )

  it.each([0.001, 0.005, 1.234, 99_999_999.999])(
    'rejects %s for having more than 2 decimals (E20)',
    (loanAmount) => {
      expect(errorsFor('loanAmount', loanAmount)).toContain(
        VALIDATION_MESSAGES.loanAmountTooPrecise,
      )
    },
  )

  it.each([100_000_000.01, 1e300])('rejects %s as too large (E21)', (loanAmount) => {
    expect(errorsFor('loanAmount', loanAmount)).toContain(VALIDATION_MESSAGES.loanAmountTooLarge)
  })

  it.each([1, 360, 600])('accepts a term of %s months (E3)', (loanTermInMonths) => {
    expect(errorsFor('loanTermInMonths', loanTermInMonths)).toEqual([])
  })

  it.each([0, -12, 1.5, 601, Number.NaN, '360'])(
    'rejects a term of %s (E3)',
    (loanTermInMonths) => {
      expect(errorsFor('loanTermInMonths', loanTermInMonths)).toContain(
        VALIDATION_MESSAGES.loanTermInvalid,
      )
    },
  )

  it.each(['LOW', 'MEDIUM', 'HIGH'])('accepts the risk band %s (E4)', (riskBand) => {
    expect(errorsFor('riskBand', riskBand)).toEqual([])
  })

  it.each(['low', 'EXTREME', '', undefined])('rejects the risk band %s (E4)', (riskBand) => {
    expect(errorsFor('riskBand', riskBand)).toEqual([VALIDATION_MESSAGES.riskBandMissing])
  })
})

describe('CommissionQuote', () => {
  const quote = { quoteId: 'Q-MED-0001', commissionRate: 0.015, totalCommission: 3750 }

  it('accepts a valid quote', () => {
    expect(commissionQuoteSchema.parse(quote)).toEqual(quote)
  })

  it.each([
    ['an empty quoteId', { ...quote, quoteId: '' }],
    ['a rate given as a percentage', { ...quote, commissionRate: 1.5 }],
    ['a negative rate', { ...quote, commissionRate: -0.01 }],
    ['a negative total', { ...quote, totalCommission: -1 }],
    ['a total as a string', { ...quote, totalCommission: '3750' }],
    ['a missing field', { quoteId: 'Q-1', commissionRate: 0.01 }],
  ])('rejects %s', (_label, body) => {
    expect(commissionQuoteSchema.safeParse(body).success).toBe(false)
  })
})

describe('CommissionQuoteApiError', () => {
  it('accepts a code and a message', () => {
    const body = { code: 'VALIDATION_ERROR', message: 'loanAmount is not acceptable' }
    expect(commissionQuoteApiErrorSchema.parse(body)).toEqual(body)
  })

  it('rejects a body without a code', () => {
    expect(commissionQuoteApiErrorSchema.safeParse({ message: 'x' }).success).toBe(false)
  })
})
