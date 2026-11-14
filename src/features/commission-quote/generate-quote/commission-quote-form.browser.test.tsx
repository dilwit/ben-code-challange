import { describe, it } from 'vitest'

describe('CommissionQuoteForm', () => {
  it.todo('keeps Generate disabled until every field is valid (E1)')
  it.todo('shows each field error after the field is touched (E2–E4, E20, E21)')
  it.todo('shows "Generating…" and blocks a second submit while a request is in progress (S1, E5)')
  it.todo('shows the generic error for every failure kind (E12, E15–E17)')
  it.todo('shows nothing and updates no state after unmount (E18)')
  it.todo('clears the alert on retry (E14)')
  it.todo('replaces the previous result with the new quote (S3)')
})
