import { describe, it } from 'vitest'

describe('Commission Quote API config', () => {
  it.todo('fails with a message naming the variable when one is missing or invalid (E13)')
  it.todo('applies the default timeout of 5000 when COMMISSION_QUOTE_API_TIMEOUT_MS is unset')
  it.todo('accepts a timeout of 9000')
  it.todo('rejects a timeout of 9001 or 15000 (above GENERATE_QUOTE_REQUEST_TIMEOUT_MS − 1000)')
})
