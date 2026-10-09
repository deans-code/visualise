/** A request the data layer refuses. `status` keeps the HTTP-style code the old server used (400 bad input, 404 missing). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
