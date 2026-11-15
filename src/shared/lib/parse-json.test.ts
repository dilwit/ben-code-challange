import { describe, expect, it } from 'vitest'
import { parseJson } from './parse-json'

describe('parseJson', () => {
  it('parses JSON text', () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 })
  })

  it.each(['', 'oops', '<html>Internal Server Error</html>'])(
    'returns undefined for %j instead of throwing',
    (text) => {
      expect(parseJson(text)).toBeUndefined()
    },
  )
})
