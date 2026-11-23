import "server-only";
import { db } from "@/server/db";
import { randomToken, sha256 } from "@/server/security/crypto";
import type { Actor } from "./actor";
import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS } from "./cookie";
import { PERMISSIONS, type Permission } from "./permissions";

/** Only refresh lastSeenAt/expiresAt this often, to avoid a write on every request. */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export interface NewSession {
  token: string;
  sessionId: string;
  maxAgeSeconds: number;
}

/**
 * Create a session. The raw token (256 bits) goes only into the cookie; the
 * database stores its SHA-256, so a database leak can't be replayed.
 */
export async function createSession(
  userId: string,
  ctx: { ipHash: string | null; userAgent: string | null },
  now = new Date(),
): Promise<NewSession> {
  const token = randomToken(32);
  const session = await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt: new Date(now.getTime() + SESSION_IDLE_MS),
      lastSeenAt: now,
      ipAddress: ctx.ipHash,
      userAgent: ctx.userAgent,
    },
    select: { id: true },
  });
  return { token, sessionId: session.id, maxAgeSeconds: Math.floor(SESSION_ABSOLUTE_MS / 1000) };
}

const isPermission = (key: string): key is Permission => key in PERMISSIONS;

/**
 * Resolve a cookie token to an Actor, or null when the session is unknown,
 * revoked, idle-expired, past its absolute lifetime, or the user is disabled.
 * Permissions are read fresh from the database on every request, so role
 * changes apply immediately.
 */
export async function validateSessionToken(token: string, now = new Date()): Promise<Actor | null> {
  if (!token || token.length > 128) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    select: {
      id: true,
      expiresAt: true,
      lastSeenAt: true,
      revokedAt: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          mustChangePassword: true,
          role: {
            select: { key: true, name: true, permissions: { select: { permission: { select: { key: true } } } } },
          },
        },
      },
    },
  });
  if (!session || session.revokedAt) return null;

  const absoluteEnd = session.createdAt.getTime() + SESSION_ABSOLUTE_MS;
  if (session.expiresAt.getTime() <= now.getTime() || absoluteEnd <= now.getTime()) return null;
  if (session.user.status !== "ACTIVE") return null;

  if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.session.update({
      where: { id: session.id },
      data: { lastSeenAt: now, expiresAt: new Date(Math.min(now.getTime() + SESSION_IDLE_MS, absoluteEnd)) },
    });
  }

  const { user } = session;
  return {
    userId: user.id,
    sessionId: session.id,
    name: user.name,
    email: user.email,
    roleKey: user.role.key,
    roleName: user.role.name,
    mustChangePassword: user.mustChangePassword,
    permissions: new Set(user.role.permissions.map((rp) => rp.permission.key).filter(isPermission)),
  };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await db.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}

/** Revoke every active session of a user (password change, disable, role change). */
export async function revokeUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
  const { count } = await db.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
  return count;
}

/** Housekeeping, called from the cron route: drop sessions that can never be valid again. */
export async function purgeDeadSessions(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const { count } = await db.session.deleteMany({
    where: { OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }] },
  });
  return count;
}
