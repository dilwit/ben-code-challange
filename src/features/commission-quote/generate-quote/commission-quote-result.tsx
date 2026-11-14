import { formatCurrency, formatPercent } from '@/shared/lib/format'
import type { CommissionQuote } from '../model'

// The generated quote (doc 02, section 3): quote ID, commission rate (1.50%) and
// total commission ($3,750.00).

export default function CommissionQuoteResult({ quote }: { quote: CommissionQuote }) {
  return (
    <section
      aria-labelledby="commission-quote-result-heading"
      className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 id="commission-quote-result-heading" className="text-lg font-semibold">
        Commission quote
      </h2>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-slate-600">Quote ID</dt>
        <dd className="font-mono">{quote.quoteId}</dd>
        <dt className="text-slate-600">Commission rate</dt>
        <dd>{formatPercent(quote.commissionRate)}</dd>
        <dt className="text-slate-600">Total commission</dt>
        <dd className="font-semibold">{formatCurrency(quote.totalCommission)}</dd>
      </dl>
    </section>
  )
}
