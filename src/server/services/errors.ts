/**
 * Expected business-rule failures. Server Actions map these to `fail(code, message)`;
 * anything else is an unexpected error and is reported generically.
 */
export class ServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export const notFoundError = (what: string) => new ServiceError("not_found", `${what} not found.`);
export const conflictError = (message: string) => new ServiceError("conflict", message);
