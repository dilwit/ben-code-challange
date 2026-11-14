import { describe, it } from 'vitest'

describe('generateCommissionQuote', () => {
  it.todo('returns invalid without calling the API when the input fails the schema (E6)')
  it.todo('returns a quote for each risk band (S2)')
  it.todo('returns rejected when the API returns 422 (E7)')
  it.todo('returns unauthorized when the API returns 401 (E8)')
  it.todo('returns upstream when the API returns 5xx (E9)')
  it.todo(
    'returns invalid-response for a non-JSON body, unexpected status or schema mismatch (E10)',
  )
  it.todo('returns timeout when the API does not answer in time (E11)')
  it.todo('returns unreachable when the API cannot be reached (E19)')
  it.todo('returns misconfigured without calling the API when config is missing or invalid (E13)')
})
