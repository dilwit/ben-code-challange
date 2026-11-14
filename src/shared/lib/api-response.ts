// One response shape for every app route answer (doc 02, section 4): { status, data }.
// Client-safe, so the browser can use the same type when reading a response.
// The HTTP status code still says what happened (201, 400, 502, 500); the body is always this.

export type ApiFailData = {
  message: string
  /** Field → messages, only for invalid input. */
  issues?: Partial<Record<string, string[]>>
}

export type ApiResponse<T> = { status: 'success'; data: T } | { status: 'fail'; data: ApiFailData }

export function successResponse<T>(data: T, httpStatus = 200): Response {
  const body: ApiResponse<T> = { status: 'success', data }
  return Response.json(body, { status: httpStatus })
}

export function failResponse(
  httpStatus: number,
  message: string,
  issues?: ApiFailData['issues'],
): Response {
  const body: ApiResponse<never> = {
    status: 'fail',
    data: issues ? { message, issues } : { message },
  }
  return Response.json(body, { status: httpStatus })
}
