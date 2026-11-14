import { expect, test } from '@playwright/test'

// One happy-path end-to-end test (doc 02, section 10): the real app against the mock API.
// Every other scenario is covered by unit and browser tests. The mock fails about 1 in 5
// requests at random, so Playwright retries this test (playwright.config.ts).

test('generates a quote and shows it (S1)', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('Loan amount ($)').fill('250000')
  await page.getByLabel('Loan term (months)').fill('360')
  await page.getByLabel('Risk band').selectOption('MEDIUM')
  await page.getByRole('button', { name: 'Generate' }).click()

  const result = page.getByRole('region', { name: 'Commission quote' })
  await expect(result).toContainText('Q-MED-0001')
  await expect(result).toContainText('1.50%')
  await expect(result).toContainText('$3,750.00')
})
