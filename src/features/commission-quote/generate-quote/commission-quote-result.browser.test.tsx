import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import CommissionQuoteResult from './commission-quote-result'

describe('CommissionQuoteResult', () => {
  it('shows the quote ID, formatted commission rate and formatted total commission (S1)', async () => {
    const screen = await render(
      <CommissionQuoteResult
        quote={{ quoteId: 'Q-MED-0001', commissionRate: 0.015, totalCommission: 3750 }}
      />,
    )

    await expect.element(screen.getByRole('heading', { name: 'Commission quote' })).toBeVisible()
    await expect.element(screen.getByText('Q-MED-0001')).toBeVisible()
    await expect.element(screen.getByText('1.50%')).toBeVisible()
    await expect.element(screen.getByText('$3,750.00')).toBeVisible()
  })
})
