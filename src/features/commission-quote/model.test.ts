import { describe, it } from 'vitest'

describe('CommissionQuoteRequest', () => {
  it.todo('requires loanAmount, loanTermInMonths and riskBand (E1)')
  it.todo('rejects a loan amount of 0, negative or not a number (E2)')
  it.todo('accepts loan amounts with up to 2 decimals, including 0.29 and 0.1 + 0.2 (E20)')
  it.todo('rejects a loan amount with more than 2 decimals, e.g. 0.001 (E20)')
  it.todo('rejects a loan amount above 100,000,000, e.g. 1e300 (E21)')
  it.todo('accepts whole-number terms from 1 to 600 (E3)')
  it.todo('rejects a term of 0, negative, with decimals or above 600 (E3)')
  it.todo('accepts only LOW, MEDIUM and HIGH as the risk band (E4)')
})
