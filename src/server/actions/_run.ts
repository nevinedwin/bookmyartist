import "server-only";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import { type ApiResult, fail, ok } from "@/lib/api";
import { AuthorizationError } from "@/server/auth/actor";
import { hashIp } from "@/server/security/crypto";
import { getClientIp, getUserAgent } from "@/server/security/request";
import type { RequestContext } from "@/server/services/auth";
import { ServiceError } from "@/server/services/errors";

/** Validate untrusted action input; failures become field errors for the form. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    throw new ServiceError("validation_error", "Please check the highlighted fields.", fieldErrors);
  }
  return result.data;
}

export async function requestContext(): Promise<RequestContext> {
  const h = await headers();
  return { ipHash: hashIp(getClientIp(h)), userAgent: getUserAgent(h) };
}

/**
 * Runs an action body and maps expected failures to the ApiResult envelope.
 * Next.js control-flow errors (redirect, notFound) are re-thrown. Unexpected
 * errors are logged by name only (no input, no personal data) and reported
 * generically.
 */
export async function runAction<T>(name: string, body: () => Promise<T>): Promise<ApiResult<T>> {
  try {
    return ok(await body());
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServiceError) return fail(error.code, error.message, error.fieldErrors);
    if (error instanceof AuthorizationError) return fail("forbidden", "You don't have permission to do that.");
    console.error(`[action:${name}] failed`, error instanceof Error ? error.name : "unknown");
    return fail("server_error", "Something went wrong. Please try again.");
  }
}

/** FormData → plain object of string values (last value wins). */
export function formObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string") out[key] = value;
  return out;
}
