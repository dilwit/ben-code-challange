import { describe, it } from 'vitest'

describe('requestCommissionQuote', () => {
  it.todo('maps 201 with a valid quote to ok')
  it.todo('maps 400 INVALID_REQUEST to invalid with field issues (E6)')
  it.todo('maps 502 QUOTE_UNAVAILABLE and 500 INTERNAL_ERROR to unavailable')
  it.todo('maps a non-JSON body, unexpected status or 201 failing the schema to unexpected (E17)')
  it.todo('maps a network error to network (E12)')
  it.todo('returns timeout when the timer fires (fake timers) (E15)')
  it.todo('returns aborted when the unmount signal is aborted (E18)')
  it.todo('returns aborted when both signals have fired (E18)')
  it.todo('clears the timer after a response')
  it.todo('never throws')
})
