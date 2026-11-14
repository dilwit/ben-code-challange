import { describe, expect, it } from 'vitest'
import { formatCurrency, formatPercent } from './format'

describe('formatCurrency', () => {
  it.each([
    [3750, '$3,750.00'],
    [0, '$0.00'],
    [1234.5, '$1,234.50'],
    [100_000_000, '$100,000,000.00'],
  ])('formats %s as %s', (amount, expected) => {
    expect(formatCurrency(amount)).toBe(expected)
  })
})

describe('formatPercent', () => {
  it.each([
    [0.015, '1.50%'],
    [0.02, '2.00%'],
    [0, '0.00%'],
  ])('formats %s as %s', (rate, expected) => {
    expect(formatPercent(rate)).toBe(expected)
  })
})
