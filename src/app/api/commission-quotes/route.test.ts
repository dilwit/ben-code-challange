import { describe, it } from 'vitest'

describe('POST /api/commission-quotes', () => {
  it.todo('returns 201 with the quote when the use case returns ok')
  it.todo('returns 400 INVALID_REQUEST with field issues for an invalid body (E6)')
  it.todo('returns 400 for a non-JSON body')
  it.todo(
    'returns the same 502 QUOTE_UNAVAILABLE body for every third-party failure kind (E7–E11, E19)',
  )
  it.todo('returns 500 INTERNAL_ERROR when config is missing or invalid (E13)')
  it.todo('returns 500 INTERNAL_ERROR when the use case throws (E16)')
  it.todo('never includes upstream details or stack traces in any body')
})
