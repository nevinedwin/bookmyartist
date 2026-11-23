/** Standard response envelope for Route Handlers and Server Actions. */
export type ApiError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export const ok = <T>(data: T): ApiResult<T> => ({ ok: true, data });
export const fail = (code: string, message: string, fieldErrors?: ApiError["fieldErrors"]): ApiResult<never> => ({
  ok: false,
  error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) },
});
