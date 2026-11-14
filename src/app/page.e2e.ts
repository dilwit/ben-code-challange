import { test } from '@playwright/test'

// End-to-end tests for Generate Commission Quote (doc 02, section 10).
// Run against the real app and the mock API with MOCK_ERROR_RATE=0.

test.describe('Generate Commission Quote', () => {
  test.fixme('shows a quote for each risk band (S1, S2)', async () => {})
  test.fixme('keeps Generate disabled until every field is valid (E1)', async () => {})
  test.fixme('shows the generic error for the forced-error amount 13 (E7–E11)', async () => {})
  test.fixme('clears the alert and shows a quote after changing the amount and generating again (E14)', async () => {})
  test.fixme('shows the generic error when the request is aborted (E12)', async () => {})
  test.fixme('shows the generic error when the app route never answers and the clock passes the timeout (E15)', async () => {})
  test.fixme('shows the generic error when the app route returns an HTML 500 page (E16, E17)', async () => {})
})
