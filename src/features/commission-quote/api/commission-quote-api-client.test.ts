import { describe, it } from 'vitest'

describe('Commission Quote API client', () => {
  it.todo('sends the x-api-key header')
  it.todo('parses a 201 into a CommissionQuote (S1)')
  it.todo('maps 401 to unauthorized (E8)')
  it.todo('maps 422 to rejected (E7)')
  it.todo('maps 5xx to upstream (E9)')
  it.todo('maps a non-JSON body, unexpected status or schema mismatch to invalid-response (E10)')
  it.todo('maps a timeout to timeout (E11)')
  it.todo('maps a network error to unreachable (E19)')
  it.todo('never throws')
})
