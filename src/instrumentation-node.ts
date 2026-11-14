// Node.js-only startup check, loaded by instrumentation.ts (doc 02, E13).
// A missing or invalid Commission Quote API setting is a deploy mistake, so the server refuses
// to start and lists every problem, instead of failing each quote request later.

import { readCommissionQuoteApiConfig } from '@/features/commission-quote/vendor/commission-quote-api-config'

try {
  readCommissionQuoteApiConfig()
} catch (error) {
  // A plain throw is not enough: Next logs it but keeps serving, answering every request
  // with 500. Exit so a bad deploy can't look healthy.
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
