import { describe, expect, it } from 'vitest'
import { failResponse, successResponse } from './api-response'

describe('successResponse', () => {
  it('answers { status: "success", data } with the given HTTP status', async () => {
    const response = successResponse({ quoteId: 'Q-1' }, 201)
    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({ status: 'success', data: { quoteId: 'Q-1' } })
  })

  it('defaults to 200', () => {
    expect(successResponse('x').status).toBe(200)
  })
})

describe('failResponse', () => {
  it('answers { status: "fail", data: { message } } with the given HTTP status', async () => {
    const response = failResponse(502, 'Try again.')
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ status: 'fail', data: { message: 'Try again.' } })
  })

  it('includes issues only when given', async () => {
    const issues = { loanAmount: ['Enter a loan amount greater than 0'] }
    expect(await failResponse(400, 'Check the fields.', issues).json()).toEqual({
      status: 'fail',
      data: { message: 'Check the fields.', issues },
    })
    expect(await failResponse(400, 'No issues.').json()).not.toHaveProperty('data.issues')
  })
})
