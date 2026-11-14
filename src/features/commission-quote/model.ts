import { z } from 'zod'

// Data model for Generate Commission Quote (doc 02, section 2).
// One source of truth for the form, the app route, the API client and the mock fixtures.

// Sanity ceilings, not business rules: they keep absurd values away from the vendor.
export const LOAN_AMOUNT_MAX = 100_000_000
export const LOAN_TERM_MAX_MONTHS = 600

export const RISK_BANDS = ['LOW', 'MEDIUM', 'HIGH'] as const

// Shown under the fields (scenarios E2–E4, E20, E21), so the form and the server say the same thing.
export const VALIDATION_MESSAGES = {
  loanAmountInvalid: 'Enter a loan amount greater than 0',
  loanAmountTooPrecise: 'Enter a loan amount with no more than 2 decimal places',
  loanAmountTooLarge: 'Enter a loan amount up to $100,000,000',
  loanTermInvalid: `Enter a loan term in whole months from 1 to ${LOAN_TERM_MAX_MONTHS}`,
  riskBandMissing: 'Select a risk band',
} as const

/**
 * True when `value` has at most 2 decimal places, allowing for floating point error
 * (`0.29 * 100` is `28.999999999999996`).
 *
 * The tolerance scales with the size of the number. A fixed tolerance such as `1e-9`
 * wrongly rejects many valid amounts near the $100M ceiling, where one floating point
 * step at `value * 100` is about `2e-6`.
 */
export function hasAtMostTwoDecimals(value: number): boolean {
  const cents = value * 100
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(cents)) * 4
  return Math.abs(cents - Math.round(cents)) <= tolerance
}

export const riskBandSchema = z.enum(RISK_BANDS, { error: VALIDATION_MESSAGES.riskBandMissing })

export const commissionQuoteRequestSchema = z.object({
  loanAmount: z
    .number({ error: VALIDATION_MESSAGES.loanAmountInvalid })
    .positive(VALIDATION_MESSAGES.loanAmountInvalid)
    .max(LOAN_AMOUNT_MAX, VALIDATION_MESSAGES.loanAmountTooLarge)
    .refine(hasAtMostTwoDecimals, VALIDATION_MESSAGES.loanAmountTooPrecise),
  loanTermInMonths: z
    .number({ error: VALIDATION_MESSAGES.loanTermInvalid })
    .int(VALIDATION_MESSAGES.loanTermInvalid)
    .min(1, VALIDATION_MESSAGES.loanTermInvalid)
    .max(LOAN_TERM_MAX_MONTHS, VALIDATION_MESSAGES.loanTermInvalid),
  riskBand: riskBandSchema,
})

export const commissionQuoteSchema = z.object({
  quoteId: z.string().min(1),
  // A decimal rate, not a percentage: 0.015 means 1.5%.
  commissionRate: z.number().min(0).max(1),
  // Dollars.
  totalCommission: z.number().nonnegative(),
})

// Error body from the Commission Quote API. Logged on the server only, never sent to the browser.
export const commissionQuoteApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
})

export type RiskBand = z.infer<typeof riskBandSchema>
export type CommissionQuoteRequest = z.infer<typeof commissionQuoteRequestSchema>
export type CommissionQuote = z.infer<typeof commissionQuoteSchema>
export type CommissionQuoteApiError = z.infer<typeof commissionQuoteApiErrorSchema>
