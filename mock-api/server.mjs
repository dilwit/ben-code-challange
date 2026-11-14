// Local stand-in for third-party APIs (doc 02, section 8).
// Each <name>-api/ folder is served under /<name>-api. Its scenarios.json says what to return;
// this file only matches requests to those pre-configured responses.

import { readdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'

const PORT = 4010
const ERROR_RATE = 0.2 // share of requests that fail at random: about 1 in 5
const TIMEOUT_DELAY_MS = 10_000 // how long the "timeout" error waits; longer than the app's timeout

// { 'commission-quote-api': { routes: [...] }, ... }
const apis = Object.fromEntries(
  readdirSync(import.meta.dirname)
    .filter((name) => name.endsWith('-api'))
    .map((name) => [name, readJson(join(import.meta.dirname, name, 'scenarios.json'))]),
)

createServer(async (req, res) => {
  const [, prefix, ...rest] = req.url.split('/')
  const route = apis[prefix]?.routes.find(
    (r) => r.method === req.method && r.path === `/${rest.join('/')}`,
  )
  if (!route) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ code: 'NOT_FOUND', message: `No mock for ${req.url}` }))
  }

  const dir = join(import.meta.dirname, prefix)
  const label = `${req.method} ${req.url}`

  // 1. API key header missing or empty. Any non-empty value is accepted.
  if (route.auth && !req.headers[route.auth.header]?.trim()) {
    return sendFixture(res, dir, route.auth, `${label}: missing or empty ${route.auth.header}`)
  }

  const body = await readBody(req)

  // 2. Forced error, e.g. loanAmount 13
  const { field, equals } = route.forceError ?? {}
  if (field && body?.[field] === equals) {
    return sendRandomError(req, res, dir, route, `${label}: forced (${field} ${equals})`)
  }

  // 3. Random error, about ERROR_RATE of the time
  if (Math.random() < ERROR_RATE) {
    return sendRandomError(req, res, dir, route, `${label}: random failure (rate ${ERROR_RATE})`)
  }

  // 4. A response whose "when" matches the body, otherwise the fallback (422)
  const match = route.responses.find((r) =>
    Object.entries(r.when).every(([key, value]) => body?.[key] === value),
  )
  return sendFixture(res, dir, match ?? route.fallback, label)
}).listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT} (error rate ${ERROR_RATE})`)
})

function sendRandomError(req, res, dir, route, reason) {
  const error = route.errorPool[Math.floor(Math.random() * route.errorPool.length)]

  if (error.behaviour === 'drop') {
    console.log(`${reason} → connection dropped`)
    return req.socket.destroy()
  }
  if (error.behaviour === 'timeout') {
    console.log(`${reason} → no reply for ${TIMEOUT_DELAY_MS} ms`)
    return setTimeout(() => req.socket.destroy(), TIMEOUT_DELAY_MS)
  }
  return sendFixture(res, dir, error, reason)
}

function sendFixture(res, dir, { status, fixture }, reason) {
  console.log(`${reason} → ${status} ${fixture}`)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(readFileSync(join(dir, 'fixtures', fixture)))
}

// The parsed JSON body, or undefined if it isn't valid JSON.
async function readBody(req) {
  let text = ''
  for await (const chunk of req) text += chunk
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}
