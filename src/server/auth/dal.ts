import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { type Actor, can } from "./actor";
import { SESSION_COOKIE } from "./cookie";
import type { Permission } from "./permissions";
import { validateSessionToken } from "./session";

/**
 * Data Access Layer for the current user. Every admin page, Server Action and
 * Route Handler calls one of these — layouts are not a security boundary
 * because Next.js renders layouts and pages in parallel.
 *
 * Deduplicated per request with React `cache`; never cached across requests,
 * so revocation and role changes take effect on the next request.
 */
export const getActor = cache(async (): Promise<Actor | null> => {
  // Session validity depends on the current time: always evaluate at request time.
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? validateSessionToken(token) : null;
});

export const CHANGE_PASSWORD_PATH = "/admin/change-password";

/**
 * For pages and actions: the signed-in actor, or a redirect to the login page.
 * Accounts on a temporary password are sent to the change-password screen
 * until they set their own.
 */
export async function requireActor(options: { allowPendingPasswordChange?: boolean } = {}): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/admin/login");
  if (actor.mustChangePassword && !options.allowPendingPasswordChange) redirect(CHANGE_PASSWORD_PATH);
  return actor;
}

/** The actor if they hold `permission`; null if signed in without it (render a no-access state). */
export async function actorWith(permission: Permission): Promise<Actor | null> {
  const actor = await requireActor();
  return can(actor, permission) ? actor : null;
}
