// Display formatting for money and rates. Amounts are Australian dollars.

const LOCALE = 'en-AU'
const CURRENCY = 'AUD'

const currencyFormat = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY })

const percentFormat = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** `3750` → `"$3,750.00"` */
export function formatCurrency(amount: number): string {
  return currencyFormat.format(amount)
}

/** A decimal rate, not a percentage: `0.015` → `"1.50%"` */
export function formatPercent(rate: number): string {
  return percentFormat.format(rate)
}
