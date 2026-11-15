/**
 * `JSON.parse` that never throws: text that isn't JSON (e.g. an HTML error page) becomes
 * `undefined`, so a schema's `safeParse` rejects it like any other wrong shape.
 */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
