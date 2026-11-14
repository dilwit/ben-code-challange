import CommissionQuoteForm from '@/features/commission-quote/generate-quote/commission-quote-form'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Commission Quote</h1>
      <CommissionQuoteForm />
    </main>
  )
}
