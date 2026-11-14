import { describe, expect, it } from 'vitest'
import { readCommissionQuoteApiConfig } from './commission-quote-api-config'

const validEnv = {
  COMMISSION_QUOTE_API_BASE_URL: 'http://localhost:4010/commission-quote-api',
  COMMISSION_QUOTE_API_KEY: 'local-dev-key',
}

/** The problems listed in the thrown error, or [] when the config is valid. */
function problems(env: Record<string, string | undefined>): string[] {
  try {
    readCommissionQuoteApiConfig(env)
    return []
  } catch (error) {
    const message = (error as Error).message
    expect(message).toMatch(/^Invalid Commission Quote API configuration:\n/)
    return message
      .split('\n')
      .slice(1)
      .map((line) => line.replace(/^ {2}- /, ''))
  }
}

describe('readCommissionQuoteApiConfig', () => {
  it('returns the config when every value is valid', () => {
    expect(readCommissionQuoteApiConfig(validEnv)).toEqual({
      baseUrl: 'http://localhost:4010/commission-quote-api',
      apiKey: 'local-dev-key',
      timeoutMs: 5000,
    })
  })

  it.each([
    ['COMMISSION_QUOTE_API_BASE_URL', undefined],
    ['COMMISSION_QUOTE_API_BASE_URL', 'not a url'],
    ['COMMISSION_QUOTE_API_BASE_URL', 'ftp://vendor.test'],
    ['COMMISSION_QUOTE_API_KEY', undefined],
    ['COMMISSION_QUOTE_API_KEY', '   '],
    ['COMMISSION_QUOTE_API_TIMEOUT_MS', 'abc'],
    ['COMMISSION_QUOTE_API_TIMEOUT_MS', '0'],
    ['COMMISSION_QUOTE_API_TIMEOUT_MS', '1.5'],
  ])('throws with a message naming %s when it is %j (E13)', (name, value) => {
    const messages = problems({ ...validEnv, [name]: value })
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatch(new RegExp(`^${name}: `))
  })

  it.each([undefined, '', '  '])('defaults the timeout to 5000 when it is %j', (value) => {
    const config = readCommissionQuoteApiConfig({
      ...validEnv,
      COMMISSION_QUOTE_API_TIMEOUT_MS: value,
    })
    expect(config.timeoutMs).toBe(5000)
  })

  it('accepts a timeout of 9000', () => {
    const config = readCommissionQuoteApiConfig({
      ...validEnv,
      COMMISSION_QUOTE_API_TIMEOUT_MS: '9000',
    })
    expect(config.timeoutMs).toBe(9000)
  })

  it.each(['9001', '15000'])(
    'rejects a timeout of %s (above GENERATE_QUOTE_REQUEST_TIMEOUT_MS − 1000)',
    (value) => {
      expect(problems({ ...validEnv, COMMISSION_QUOTE_API_TIMEOUT_MS: value })).toEqual([
        'COMMISSION_QUOTE_API_TIMEOUT_MS: must be a whole number from 1 to 9000',
      ])
    },
  )

  it('removes a trailing slash from the base URL', () => {
    const config = readCommissionQuoteApiConfig({
      ...validEnv,
      COMMISSION_QUOTE_API_BASE_URL: 'https://vendor.test/api/',
    })
    expect(config.baseUrl).toBe('https://vendor.test/api')
  })

  it('lists every problem at once', () => {
    expect(problems({})).toEqual([
      'COMMISSION_QUOTE_API_BASE_URL: must be an http(s) URL',
      'COMMISSION_QUOTE_API_KEY: must not be empty',
    ])
  })

  it('never includes the API key in the error', () => {
    const messages = problems({
      COMMISSION_QUOTE_API_KEY: 'very-secret-key',
      COMMISSION_QUOTE_API_TIMEOUT_MS: '99999',
    })
    expect(messages.join(' ')).not.toContain('very-secret-key')
  })
})
