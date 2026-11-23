import "server-only";
import type { Actor } from "@/server/auth/actor";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/server/auth/password";
import { createSession, type NewSession, revokeSession, revokeUserSessions } from "@/server/auth/session";
import { db } from "@/server/db";
import { audit, maskEmail, maskPhone } from "./audit";
import { ServiceError } from "./errors";

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

export interface RequestContext {
  ipHash: string | null;
  userAgent: string | null;
}

/** One message for every failure, so responses don't reveal which emails exist or are locked. */
export const INVALID_CREDENTIALS = "Incorrect email or password.";

/**
 * Verify credentials and open a session. Failure paths do equivalent Argon2
 * work and return the same error. Five consecutive failures lock the account
 * for 15 minutes (on top of the per-IP rate limit in the login action).
 */
export async function authenticate(
  email: string,
  password: string,
  ctx: RequestContext,
  now = new Date(),
): Promise<{ session: NewSession; userId: string }> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, passwordHash: true, status: true, lockedUntil: true },
  });

  if (!user) {
    await verifyAgainstDummy(password);
    await audit({ actorId: null, action: "auth.login_failed", entityType: "User", after: { reason: "unknown_account" }, ipHash: ctx.ipHash });
    throw new ServiceError("invalid_credentials", INVALID_CREDENTIALS);
  }

  if (user.lockedUntil && user.lockedUntil > now) {
    await verifyAgainstDummy(password);
    await audit({ actorId: null, action: "auth.login_failed", entityType: "User", entityId: user.id, after: { reason: "locked" }, ipHash: ctx.ipHash });
    throw new ServiceError("invalid_credentials", INVALID_CREDENTIALS);
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    // Atomic increment; lock and reset the counter when the threshold is reached.
    const updated = await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });
    const locked = updated.failedLoginCount >= MAX_FAILED_LOGINS;
    if (locked) {
      await db.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: new Date(now.getTime() + LOCKOUT_MS) },
      });
    }
    await audit({
      actorId: null,
      action: locked ? "auth.account_locked" : "auth.login_failed",
      entityType: "User",
      entityId: user.id,
      after: { reason: "wrong_password" },
      ipHash: ctx.ipHash,
    });
    throw new ServiceError("invalid_credentials", INVALID_CREDENTIALS);
  }

  if (user.status !== "ACTIVE") {
    await audit({ actorId: null, action: "auth.login_failed", entityType: "User", entityId: user.id, after: { reason: "disabled" }, ipHash: ctx.ipHash });
    throw new ServiceError("invalid_credentials", INVALID_CREDENTIALS);
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
  });
  const session = await createSession(user.id, ctx, now);
  await audit({ actorId: user.id, action: "auth.login", entityType: "Session", entityId: session.sessionId, ipHash: ctx.ipHash });
  return { session, userId: user.id };
}

export async function signOut(actor: Actor, ctx: RequestContext): Promise<void> {
  await revokeSession(actor.sessionId);
  await audit({ actorId: actor.userId, action: "auth.logout", entityType: "Session", entityId: actor.sessionId, ipHash: ctx.ipHash });
}

/** Change own password; every other session of the user is revoked. */
export async function changeOwnPassword(
  actor: Actor,
  input: { currentPassword: string; newPassword: string },
  ctx: RequestContext,
): Promise<{ revokedSessions: number }> {
  const user = await db.user.findUniqueOrThrow({ where: { id: actor.userId }, select: { passwordHash: true } });
  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    throw new ServiceError("invalid_password", "Your current password is incorrect.", {
      currentPassword: ["Your current password is incorrect."],
    });
  }
  await db.user.update({
    where: { id: actor.userId },
    data: { passwordHash: await hashPassword(input.newPassword), mustChangePassword: false, passwordChangedAt: new Date() },
  });
  const revokedSessions = await revokeUserSessions(actor.userId, actor.sessionId);
  await audit({ actorId: actor.userId, action: "auth.password_changed", entityType: "User", entityId: actor.userId, after: { revokedSessions }, ipHash: ctx.ipHash });
  return { revokedSessions };
}

export interface SessionSummary {
  id: string;
  current: boolean;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  userAgent: string | null;
}

export async function listOwnSessions(actor: Actor, now = new Date()): Promise<SessionSummary[]> {
  const sessions = await db.session.findMany({
    where: { userId: actor.userId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, createdAt: true, lastSeenAt: true, expiresAt: true, userAgent: true },
  });
  return sessions.map((s) => ({ ...s, current: s.id === actor.sessionId }));
}

export async function revokeOwnSession(actor: Actor, sessionId: string, ctx: RequestContext): Promise<void> {
  const { count } = await db.session.updateMany({
    where: { id: sessionId, userId: actor.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) throw new ServiceError("not_found", "That session has already ended.");
  await audit({ actorId: actor.userId, action: "auth.session_revoked", entityType: "Session", entityId: sessionId, ipHash: ctx.ipHash });
}

export async function revokeOtherOwnSessions(actor: Actor, ctx: RequestContext): Promise<number> {
  const count = await revokeUserSessions(actor.userId, actor.sessionId);
  await audit({ actorId: actor.userId, action: "auth.sessions_revoked", entityType: "User", entityId: actor.userId, after: { count }, ipHash: ctx.ipHash });
  return count;
}

export interface OwnProfile {
  name: string;
  email: string;
  phone: string | null;
}

export async function getOwnProfile(actor: Actor): Promise<OwnProfile> {
  return db.user.findUniqueOrThrow({ where: { id: actor.userId }, select: { name: true, email: true, phone: true } });
}

/** Users may change their own name and phone. Role changes stay with admins. */
export async function updateOwnProfile(
  actor: Actor,
  input: { name: string; phone: string | null },
  ctx: RequestContext,
): Promise<void> {
  const before = await getOwnProfile(actor);
  if (before.name === input.name && before.phone === input.phone) return;
  await db.user.update({ where: { id: actor.userId }, data: { name: input.name, phone: input.phone } });
  await audit({
    actorId: actor.userId,
    action: "user.profile_updated",
    entityType: "User",
    entityId: actor.userId,
    before: { name: before.name, phone: maskPhone(before.phone) },
    after: { name: input.name, phone: maskPhone(input.phone) },
    ipHash: ctx.ipHash,
  });
}

/**
 * Change own sign-in email. Requires the current password (the email is a
 * credential), refuses addresses already in use, and signs out other devices.
 * No confirmation email is sent yet: that needs the email integration (Phase 6).
 */
export async function changeOwnEmail(
  actor: Actor,
  input: { email: string; currentPassword: string },
  ctx: RequestContext,
): Promise<{ revokedSessions: number }> {
  const user = await db.user.findUniqueOrThrow({ where: { id: actor.userId }, select: { email: true, passwordHash: true } });
  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    throw new ServiceError("invalid_password", "Your current password is incorrect.", {
      currentPassword: ["Your current password is incorrect."],
    });
  }
  if (input.email === user.email) {
    throw new ServiceError("unchanged", "That's already your email.", { email: ["That's already your email."] });
  }
  await assertEmailAvailable(input.email);
  await db.user.update({ where: { id: actor.userId }, data: { email: input.email } });
  const revokedSessions = await revokeUserSessions(actor.userId, actor.sessionId);
  await audit({
    actorId: actor.userId,
    action: "user.email_changed",
    entityType: "User",
    entityId: actor.userId,
    before: { email: maskEmail(user.email) },
    after: { email: maskEmail(input.email), revokedSessions },
    ipHash: ctx.ipHash,
  });
  return { revokedSessions };
}

export async function assertEmailAvailable(email: string, exceptUserId?: string): Promise<void> {
  const taken = await db.user.findFirst({
    where: { email, ...(exceptUserId ? { id: { not: exceptUserId } } : {}) },
    select: { id: true },
  });
  if (taken) throw new ServiceError("email_taken", "Another account already uses this email.", { email: ["Already in use."] });
}
