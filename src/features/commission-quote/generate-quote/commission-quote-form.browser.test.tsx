import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import CommissionQuoteForm from './commission-quote-form'

const GENERIC_ERROR = "We couldn't generate a quote right now. Please try again."
const lowQuote = { quoteId: 'Q-LOW-0001', commissionRate: 0.01, totalCommission: 2500 }
const highQuote = { quoteId: 'Q-HIGH-0001', commissionRate: 0.02, totalCommission: 5000 }

async function renderForm() {
  const screen = await render(<CommissionQuoteForm />)
  const amount = screen.getByLabelText('Loan amount ($)')
  const term = screen.getByLabelText('Loan term (months)')
  const riskBand = screen.getByLabelText('Risk band')
  return {
    screen,
    amount,
    term,
    riskBand,
    // The only button; its name changes to "Generating…" while a request is in progress.
    generate: screen.getByRole('button'),
    async fillValid(band = 'MEDIUM') {
      await amount.fill('250000')
      await term.fill('360')
      await riskBand.selectOptions(band)
    },
  }
}

/** The app route's reply: a status code and a body (a string is sent as is). */
function reply(status: number, body: unknown) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
}

/** The route's { status, data } bodies. */
const success = (data: unknown) => ({ status: 'success', data })
const fail = (message = GENERIC_ERROR) => ({ status: 'fail', data: { message } })

/** A fetch whose reply the test controls: it waits until `respond()` is called. */
function pausedFetch() {
  let respond: (response: Response) => void = () => {}
  const fetchMock = vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        respond = resolve
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, respond: (response: Response) => respond(response) }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('CommissionQuoteForm', () => {
  it('keeps Generate enabled before anything is filled in, so it can explain what is missing', async () => {
    const { generate } = await renderForm()
    await expect.element(generate).toBeEnabled()
  })

  it('starts with no risk band selected, not the first option', async () => {
    const { riskBand } = await renderForm()
    await expect.element(riskBand).toHaveValue('')
  })

  it('shows every missing field, focuses the first and sends nothing when Generate is clicked (E1)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { amount, term, riskBand, generate } = await renderForm()
    await generate.click()

    await expect.element(amount).toHaveAccessibleDescription('Enter a loan amount greater than 0')
    await expect
      .element(term)
      .toHaveAccessibleDescription('Enter a loan term in whole months from 1 to 600')
    await expect.element(riskBand).toHaveAccessibleDescription('Select a risk band')
    await expect.element(amount).toHaveFocus()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows and focuses the one invalid field when Generate is clicked, and sends nothing (E3)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { amount, term, riskBand, generate } = await renderForm()
    await amount.fill('250000')
    await term.fill('601')
    await riskBand.selectOptions('MEDIUM')
    await generate.click()

    await expect
      .element(term)
      .toHaveAccessibleDescription('Enter a loan term in whole months from 1 to 600')
    await expect.element(term).toHaveFocus()
    await expect.element(amount).not.toHaveAttribute('aria-invalid')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows no errors before Generate is clicked, even after leaving an invalid field', async () => {
    const { amount, term, riskBand } = await renderForm()
    await amount.fill('0')
    await userEvent.tab()
    for (const field of [amount, term, riskBand]) {
      await expect.element(field).not.toHaveAttribute('aria-invalid')
      await expect.element(field).not.toHaveAccessibleDescription()
    }
  })

  it.each([
    ['', 'Enter a loan amount greater than 0'],
    ['0', 'Enter a loan amount greater than 0'],
    ['-5', 'Enter a loan amount greater than 0'],
    ['abc', 'Enter a loan amount greater than 0'],
    ['0.001', 'Enter a loan amount with no more than 2 decimal places'],
    ['100000000.01', 'Enter a loan amount up to $100,000,000'],
  ])(
    'shows an error for loan amount %j when Generate is clicked (E2, E20, E21)',
    async (value, message) => {
      vi.stubGlobal('fetch', vi.fn())
      const { screen, amount, generate } = await renderForm()
      if (value) await amount.fill(value)
      await generate.click()

      await expect.element(screen.getByText(message)).toBeVisible()
      await expect.element(amount).toHaveAttribute('aria-invalid', 'true')
      await expect.element(amount).toHaveAccessibleDescription(message)
    },
  )

  it.each(['', '0', '1.5', '601'])(
    'shows an error for loan term %j when Generate is clicked (E3)',
    async (value) => {
      vi.stubGlobal('fetch', vi.fn())
      const { screen, term, generate } = await renderForm()
      if (value) await term.fill(value)
      await generate.click()

      await expect
        .element(screen.getByText('Enter a loan term in whole months from 1 to 600'))
        .toBeVisible()
    },
  )

  it('shows an error when Generate is clicked without a risk band (E4)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const { riskBand, generate } = await renderForm()
    await generate.click()

    // Checked through the select itself: the placeholder option has the same text as the error.
    await expect.element(riskBand).toHaveAttribute('aria-invalid', 'true')
    await expect.element(riskBand).toHaveAccessibleDescription('Select a risk band')
  })

  it('after Generate, clears an error as soon as the value becomes valid', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const { screen, amount, generate } = await renderForm()
    await amount.fill('0')
    await generate.click()
    await expect.element(screen.getByText('Enter a loan amount greater than 0')).toBeVisible()

    await amount.fill('250000')
    await expect
      .element(screen.getByText('Enter a loan amount greater than 0'))
      .not.toBeInTheDocument()
    await expect.element(amount).not.toHaveAttribute('aria-invalid')
  })

  describe('generating a quote', () => {
    it('disables the fields and shows "Generating…" until the reply, then shows the quote (S1, E5)', async () => {
      const { screen, amount, term, riskBand, generate, fillValid } = await renderForm()
      const { fetchMock, respond } = pausedFetch()
      await fillValid()
      await generate.click()

      await expect.element(generate).toHaveTextContent('Generating…')
      await expect.element(generate).toBeDisabled()
      for (const field of [amount, term, riskBand]) await expect.element(field).toBeDisabled()
      expect(fetchMock).toHaveBeenCalledTimes(1) // a second click can't send another request

      respond(reply(201, success(lowQuote)))
      await expect.element(screen.getByText('Q-LOW-0001')).toBeVisible()
      await expect.element(screen.getByText('1.00%')).toBeVisible()
      await expect.element(screen.getByText('$2,500.00')).toBeVisible()
      await expect.element(generate).toHaveTextContent('Generate Quote')
      await expect.element(amount).toBeEnabled()
    })

    it.each([
      ['a 502 fail (vendor failure)', () => reply(502, fail())],
      ['a 500 fail (our own error)', () => reply(500, fail())],
      ['an HTML 500 page', () => reply(500, '<html>Internal Server Error</html>')],
      ['an unexpected 404', () => reply(404, '<html>Not found</html>')],
      ['success without a quote', () => reply(201, success({ quoteId: 'Q-1' }))],
    ])(
      'shows the generic error for %s and keeps the values (E7–E11, E16, E17)',
      async (_label, makeReply) => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.stubGlobal(
          'fetch',
          vi.fn(async () => makeReply()),
        )
        const { screen, amount, generate, fillValid } = await renderForm()
        await fillValid()
        await generate.click()

        await expect.element(screen.getByRole('alert')).toHaveTextContent(GENERIC_ERROR)
        await expect.element(amount).toHaveValue('250000')
        await expect.element(generate).toBeEnabled()
      },
    )

    it("shows the route's own message from a fail, e.g. a 400 (E6)", async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const message = "Some loan details aren't valid. Please check them and try again."
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => reply(400, fail(message))),
      )
      const { screen, generate, fillValid } = await renderForm()
      await fillValid()
      await generate.click()

      await expect.element(screen.getByRole('alert')).toHaveTextContent(message)
    })

    it('shows the generic error when the server cannot be reached (E12)', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new TypeError('Failed to fetch')
        }),
      )
      const { screen, generate, fillValid } = await renderForm()
      await fillValid()
      await generate.click()

      await expect.element(screen.getByRole('alert')).toHaveTextContent(GENERIC_ERROR)
    })

    it('cancels the request and shows nothing after unmount (E18)', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { fetchMock } = pausedFetch()
      const { screen, generate, fillValid } = await renderForm()
      await fillValid()
      await generate.click()
      await expect.element(generate).toHaveTextContent('Generating…')

      await screen.unmount()

      const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
      expect(init.signal?.aborted).toBe(true)
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(log).not.toHaveBeenCalled()
    })

    it('clears the alert when the user tries again (E14)', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => reply(502, fail())),
      )
      const { screen, generate, fillValid } = await renderForm()
      await fillValid()
      await generate.click()
      await expect.element(screen.getByRole('alert')).toBeVisible()

      const { respond } = pausedFetch()
      await generate.click()
      await expect.element(screen.getByRole('alert')).not.toBeInTheDocument()

      respond(reply(201, success(lowQuote)))
      await expect.element(screen.getByText('Q-LOW-0001')).toBeVisible()
    })

    it('replaces the previous result with the new quote (S3)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, init: RequestInit) => {
          const { riskBand } = JSON.parse(init.body as string)
          return reply(201, success(riskBand === 'HIGH' ? highQuote : lowQuote))
        }),
      )
      const { screen, riskBand, generate, fillValid } = await renderForm()
      await fillValid('LOW')
      await generate.click()
      await expect.element(screen.getByText('Q-LOW-0001')).toBeVisible()

      await riskBand.selectOptions('HIGH')
      // The old quote no longer matches the form, so it's gone before Generate is clicked again.
      await expect.element(screen.getByText('Q-LOW-0001')).not.toBeInTheDocument()

      await generate.click()
      await expect.element(screen.getByText('Q-HIGH-0001')).toBeVisible()
    })

    it('clears the shown quote as soon as any value changes, so it never mismatches the form', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => reply(201, success(lowQuote))),
      )
      const { screen, amount, generate, fillValid } = await renderForm()
      await fillValid('LOW')
      await generate.click()
      await expect.element(screen.getByText('Q-LOW-0001')).toBeVisible()

      await amount.fill('300000')
      await expect.element(screen.getByText('Q-LOW-0001')).not.toBeInTheDocument()
      await expect
        .element(screen.getByRole('region', { name: 'Commission quote' }))
        .not.toBeInTheDocument()
    })
  })
})
