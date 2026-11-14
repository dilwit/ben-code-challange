import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { commissionQuoteApiErrorSchema, commissionQuoteSchema } from '../model'

// The mock must speak the same contract as the data model (doc 02, section 8).
// If a fixture drifts from the model, this test fails before anything else does.

const mockApiDir = fileURLToPath(
  new URL('../../../../mock-api/commission-quote-api/', import.meta.url),
)

type FixtureRef = { status?: number; fixture?: string }
type Route = {
  auth?: FixtureRef
  errorPool?: FixtureRef[]
  responses?: FixtureRef[]
  fallback?: FixtureRef
}

const { routes } = JSON.parse(readFileSync(`${mockApiDir}scenarios.json`, 'utf8')) as {
  routes: Route[]
}

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(`${mockApiDir}fixtures/${name}`, 'utf8'))
}

const withFixture = (refs: (FixtureRef | undefined)[]) =>
  refs.filter((ref): ref is Required<FixtureRef> => ref?.fixture !== undefined)
const isSuccess = (ref: FixtureRef) => ref.status !== undefined && ref.status < 300

const successFixtures = withFixture(routes.flatMap((route) => route.responses ?? []))
const errorFixtures = withFixture(
  routes.flatMap((route) => [route.auth, route.fallback, ...(route.errorPool ?? [])]),
).filter((ref) => !isSuccess(ref))
const brokenSuccessFixtures = withFixture(routes.flatMap((route) => route.errorPool ?? [])).filter(
  isSuccess,
)

describe('mock API fixtures match the data model', () => {
  it('references only fixtures that exist, and every fixture is referenced', () => {
    const referenced = new Set(
      [...successFixtures, ...errorFixtures, ...brokenSuccessFixtures].map((ref) => ref.fixture),
    )
    const onDisk = new Set(readdirSync(`${mockApiDir}fixtures`))
    expect([...referenced].sort()).toEqual([...onDisk].sort())
  })

  it.each(successFixtures.map((ref) => ref.fixture))(
    '%s parses as CommissionQuote (S2)',
    (name) => {
      expect(commissionQuoteSchema.safeParse(readFixture(name)).error).toBeUndefined()
    },
  )

  it.each([...new Set(errorFixtures.map((ref) => ref.fixture))])(
    '%s parses as CommissionQuoteApiError (E7–E9)',
    (name) => {
      expect(commissionQuoteApiErrorSchema.safeParse(readFixture(name)).error).toBeUndefined()
    },
  )

  it.each(brokenSuccessFixtures.map((ref) => ref.fixture))(
    '%s is a 201 that does not parse as CommissionQuote (E10)',
    (name) => {
      expect(commissionQuoteSchema.safeParse(readFixture(name)).success).toBe(false)
    },
  )
})
