"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type ApiResult, fail } from "@/lib/api";
import { changePasswordSchema, loginSchema, safeAdminRedirect } from "@/lib/validation/auth";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/auth/cookie";
import { getActor, requireActor } from "@/server/auth/dal";
import { sha256 } from "@/server/security/crypto";
import { rateLimit } from "@/server/security/rate-limit";
import { changeEmailSchema, updateProfileSchema } from "@/lib/validation/users";
import {
  authenticate,
  changeOwnPassword,
  revokeOtherOwnSessions,
  revokeOwnSession,
  signOut,
  changeOwnEmail,
  updateOwnProfile,
} from "@/server/services/auth";
import { ServiceError } from "@/server/services/errors";
import { formObject, parseInput, requestContext, runAction } from "./_run";

export type FormState = ApiResult<unknown> | null;

/**
 * Sign in. Rate limited per IP (20 / 15 min) and per account (10 / 15 min)
 * on top of the per-account lockout in the service. CSRF: Server Actions are
 * POST-only and Next.js rejects cross-origin calls; the cookie is SameSite=Lax.
 */
export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requestContext();
  const raw = formObject(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return fail("validation_error", "Enter your email and password.");
  const { email, password, next } = parsed.data;

  const [byIp, byAccount] = await Promise.all([
    rateLimit("login:ip", ctx.ipHash ?? "unknown", 20, 900),
    rateLimit("login:account", sha256(email).slice(0, 32), 10, 900),
  ]);
  if (!byIp.allowed || !byAccount.allowed) {
    return fail("rate_limited", "Too many sign-in attempts. Wait 15 minutes and try again.");
  }

  const result = await runAction("login", () => authenticate(email, password, ctx));
  if (!result.ok) return result;

  const { session } = result.data;
  (await cookies()).set(SESSION_COOKIE, session.token, sessionCookieOptions(session.maxAgeSeconds));
  redirect(safeAdminRedirect(next));
}

export async function logoutAction(): Promise<void> {
  const actor = await getActor();
  if (actor) await signOut(actor, await requestContext());
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/" });
  redirect("/admin/login");
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor({ allowPendingPasswordChange: true });
  const wasPending = actor.mustChangePassword;
  const result = await runAction("changePassword", async () => {
    const input = parseInput(changePasswordSchema, formObject(formData));
    return changeOwnPassword(actor, input, await requestContext());
  });
  if (result.ok && wasPending) redirect("/admin");
  return result;
}

export async function revokeSessionAction(sessionId: string): Promise<ApiResult<void>> {
  const actor = await requireActor();
  const result = await runAction("revokeSession", async () => {
    if (sessionId === actor.sessionId) throw new ServiceError("current_session", "Use “Sign out” to end this session.");
    await revokeOwnSession(actor, sessionId, await requestContext());
  });
  if (result.ok) refresh();
  return result;
}

export async function revokeOtherSessionsAction(): Promise<ApiResult<number>> {
  const actor = await requireActor();
  const result = await runAction("revokeOtherSessions", async () => revokeOtherOwnSessions(actor, await requestContext()));
  if (result.ok) refresh();
  return result;
}

export async function updateOwnProfileAction(input: unknown): Promise<ApiResult<void>> {
  const actor = await requireActor();
  const result = await runAction("updateOwnProfile", async () =>
    updateOwnProfile(actor, parseInput(updateProfileSchema, input), await requestContext()),
  );
  if (result.ok) refresh();
  return result;
}

export async function changeOwnEmailAction(input: unknown): Promise<ApiResult<{ revokedSessions: number }>> {
  const actor = await requireActor();
  const ctx = await requestContext();
  // Same throttle as sign-in: this endpoint also checks a password.
  const limit = await rateLimit("reauth:account", actor.userId, 10, 900);
  if (!limit.allowed) return fail("rate_limited", "Too many attempts. Wait 15 minutes and try again.");
  const result = await runAction("changeOwnEmail", async () => changeOwnEmail(actor, parseInput(changeEmailSchema, input), ctx));
  if (result.ok) refresh();
  return result;
}
