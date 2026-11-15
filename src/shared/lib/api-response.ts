import { z } from 'zod'

// One response shape for every app route answer (doc 02, section 4): { status, data }.
// Client-safe: routes build it with successResponse() / failResponse(), and the browser reads it
// back with apiResponseSchema().
// The HTTP status code still says what happened (201, 400, 502, 500); the body is always this.

// Only our own message: never field details, upstream errors or anything else.
const apiFailDataSchema = z.object({ message: z.string() })

export type ApiFailData = z.infer<typeof apiFailDataSchema>

export type ApiResponse<T> = { status: 'success'; data: T } | { status: 'fail'; data: ApiFailData }

/** Checks a route answer: `success` with `data` matching `dataSchema`, or a `fail`. */
export function apiResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.discriminatedUnion('status', [
    z.object({ status: z.literal('success'), data: dataSchema }),
    z.object({ status: z.literal('fail'), data: apiFailDataSchema }),
  ])
}

export function successResponse<T>(data: T, httpStatus = 200): Response {
  const body: ApiResponse<T> = { status: 'success', data }
  return Response.json(body, { status: httpStatus })
}

export function failResponse(httpStatus: number, message: string): Response {
  const body: ApiResponse<never> = { status: 'fail', data: { message } }
  return Response.json(body, { status: httpStatus })
}
