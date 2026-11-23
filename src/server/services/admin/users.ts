import "server-only";
import { randomBytes } from "node:crypto";
import { type Actor, authorize } from "@/server/auth/actor";
import { hashPassword } from "@/server/auth/password";
import { revokeUserSessions } from "@/server/auth/session";
import { db } from "@/server/db";
import { audit, maskEmail, maskPhone } from "../audit";
import { assertEmailAvailable, type RequestContext } from "../auth";
import { ServiceError, notFoundError } from "../errors";

const SUPER_ADMIN = "SUPER_ADMIN";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: "ACTIVE" | "DISABLED";
  roleKey: string;
  roleName: string;
  lastLoginAt: Date | null;
  mustChangePassword: boolean;
  locked: boolean;
  activeSessions: number;
  createdAt: Date;
}

export interface RoleOption {
  key: string;
  name: string;
  description: string | null;
  permissions: string[];
}

export async function listUsers(actor: Actor, now = new Date()): Promise<UserRow[]> {
  authorize(actor, "user:manage");
  const users = await db.user.findMany({
    where: { artistId: null, deletedAt: null },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      lastLoginAt: true,
      lockedUntil: true,
      mustChangePassword: true,
      createdAt: true,
      role: { select: { key: true, name: true } },
      _count: { select: { sessions: { where: { revokedAt: null, expiresAt: { gt: now } } } } },
    },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    status: u.status,
    roleKey: u.role.key,
    roleName: u.role.name,
    lastLoginAt: u.lastLoginAt,
    mustChangePassword: u.mustChangePassword,
    locked: !!u.lockedUntil && u.lockedUntil > now,
    activeSessions: u._count.sessions,
    createdAt: u.createdAt,
  }));
}

export async function listRoles(actor: Actor): Promise<RoleOption[]> {
  authorize(actor, "user:manage");
  const roles = await db.role.findMany({
    orderBy: { createdAt: "asc" },
    select: { key: true, name: true, description: true, permissions: { select: { permission: { select: { key: true } } } } },
  });
  return roles.map((r) => ({ ...r, permissions: r.permissions.map((p) => p.permission.key).sort() }));
}

/**
 * Privilege-escalation guards:
 * - only a super admin may grant the super-admin role or change a super admin;
 * - nobody may grant a role holding permissions they don't have themselves.
 */
async function assertCanGrant(actor: Actor, roleKey: string) {
  const role = await db.role.findUnique({
    where: { key: roleKey },
    select: { id: true, key: true, name: true, permissions: { select: { permission: { select: { key: true } } } } },
  });
  if (!role) throw new ServiceError("invalid_role", "That role doesn't exist.", { roleKey: ["Choose a role."] });
  if (role.key === SUPER_ADMIN && actor.roleKey !== SUPER_ADMIN) {
    throw new ServiceError("forbidden", "Only a super admin can grant the super admin role.");
  }
  const held: ReadonlySet<string> = actor.permissions;
  const exceeds = role.permissions.some((p) => !held.has(p.permission.key));
  if (exceeds) throw new ServiceError("forbidden", "You can't grant a role with more access than your own.");
  return role;
}

async function loadTarget(actor: Actor, userId: string) {
  const target = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      artistId: true,
      deletedAt: true,
      role: { select: { key: true } },
    },
  });
  if (!target || target.artistId || target.deletedAt) throw notFoundError("User");
  if (target.role.key === SUPER_ADMIN && actor.roleKey !== SUPER_ADMIN) {
    throw new ServiceError("forbidden", "Only a super admin can change a super admin's account.");
  }
  return target;
}

/** Ensures at least one active super admin always remains. */
async function assertNotLastSuperAdmin(userId: string) {
  const others = await db.user.count({
    where: { id: { not: userId }, status: "ACTIVE", role: { key: SUPER_ADMIN } },
  });
  if (others === 0) throw new ServiceError("last_super_admin", "At least one active super admin must remain.");
}

/** 18 random characters from an unambiguous alphabet (~100 bits). Shown once, never stored. */
export function generateTemporaryPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(18);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${out.slice(0, 6)}-${out.slice(6, 12)}-${out.slice(12)}`;
}

export async function createUser(
  actor: Actor,
  input: { name: string; email: string; roleKey: string },
  ctx: RequestContext,
): Promise<{ userId: string; temporaryPassword: string }> {
  authorize(actor, "user:manage");
  const role = await assertCanGrant(actor, input.roleKey);
  await assertEmailAvailable(input.email);
  const temporaryPassword = generateTemporaryPassword();
  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      roleId: role.id,
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
    },
    select: { id: true },
  });
  await audit({ actorId: actor.userId, action: "user.created", entityType: "User", entityId: user.id, after: { role: role.key }, ipHash: ctx.ipHash });
  return { userId: user.id, temporaryPassword };
}

export async function changeUserRole(actor: Actor, input: { userId: string; roleKey: string }, ctx: RequestContext) {
  authorize(actor, "user:manage");
  if (input.userId === actor.userId) throw new ServiceError("forbidden", "You can't change your own role.");
  const target = await loadTarget(actor, input.userId);
  const role = await assertCanGrant(actor, input.roleKey);
  if (target.role.key === role.key) return;
  if (target.role.key === SUPER_ADMIN) await assertNotLastSuperAdmin(target.id);
  await db.user.update({ where: { id: target.id }, data: { roleId: role.id } });
  await audit({
    actorId: actor.userId,
    action: "user.role_changed",
    entityType: "User",
    entityId: target.id,
    before: { role: target.role.key },
    after: { role: role.key },
    ipHash: ctx.ipHash,
  });
}

/** Disabling signs the user out everywhere immediately. */
export async function setUserStatus(actor: Actor, input: { userId: string; status: "ACTIVE" | "DISABLED" }, ctx: RequestContext) {
  authorize(actor, "user:manage");
  if (input.userId === actor.userId) throw new ServiceError("forbidden", "You can't disable your own account.");
  const target = await loadTarget(actor, input.userId);
  if (target.status === input.status) return;
  if (input.status === "DISABLED" && target.role.key === SUPER_ADMIN) await assertNotLastSuperAdmin(target.id);
  await db.user.update({
    where: { id: target.id },
    data: { status: input.status, ...(input.status === "ACTIVE" ? { failedLoginCount: 0, lockedUntil: null } : {}) },
  });
  const revoked = input.status === "DISABLED" ? await revokeUserSessions(target.id) : 0;
  await audit({
    actorId: actor.userId,
    action: input.status === "DISABLED" ? "user.disabled" : "user.enabled",
    entityType: "User",
    entityId: target.id,
    after: { revokedSessions: revoked },
    ipHash: ctx.ipHash,
  });
}

/** Issues a new temporary password, unlocks the account and ends all its sessions. */
export async function resetUserPassword(actor: Actor, input: { userId: string }, ctx: RequestContext) {
  authorize(actor, "user:manage");
  if (input.userId === actor.userId) {
    throw new ServiceError("forbidden", "Change your own password from your account page.");
  }
  const target = await loadTarget(actor, input.userId);
  const temporaryPassword = generateTemporaryPassword();
  await db.user.update({
    where: { id: target.id },
    data: { passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true, failedLoginCount: 0, lockedUntil: null },
  });
  const revoked = await revokeUserSessions(target.id);
  await audit({ actorId: actor.userId, action: "user.password_reset", entityType: "User", entityId: target.id, after: { revokedSessions: revoked }, ipHash: ctx.ipHash });
  return { temporaryPassword };
}

export async function signOutUserEverywhere(actor: Actor, input: { userId: string }, ctx: RequestContext) {
  authorize(actor, "user:manage");
  const target = await loadTarget(actor, input.userId);
  const revoked = await revokeUserSessions(target.id, target.id === actor.userId ? actor.sessionId : undefined);
  await audit({ actorId: actor.userId, action: "user.sessions_revoked", entityType: "User", entityId: target.id, after: { revokedSessions: revoked }, ipHash: ctx.ipHash });
  return { revoked };
}

/**
 * Edit a team member's name, email and phone. Changing the email (their
 * sign-in) ends their sessions so they sign in again with the new address.
 */
export async function updateUserDetails(
  actor: Actor,
  input: { userId: string; name: string; email: string; phone: string | null },
  ctx: RequestContext,
): Promise<{ revokedSessions: number }> {
  authorize(actor, "user:manage");
  if (input.userId === actor.userId) {
    throw new ServiceError("forbidden", "Edit your own details from your account page.");
  }
  const target = await loadTarget(actor, input.userId);
  const emailChanged = target.email !== input.email;
  if (emailChanged) await assertEmailAvailable(input.email, target.id);
  if (!emailChanged && target.name === input.name && target.phone === input.phone) return { revokedSessions: 0 };

  await db.user.update({ where: { id: target.id }, data: { name: input.name, email: input.email, phone: input.phone } });
  const revokedSessions = emailChanged ? await revokeUserSessions(target.id) : 0;
  await audit({
    actorId: actor.userId,
    action: "user.details_updated",
    entityType: "User",
    entityId: target.id,
    before: { name: target.name, email: maskEmail(target.email), phone: maskPhone(target.phone) },
    after: { name: input.name, email: maskEmail(input.email), phone: maskPhone(input.phone), revokedSessions },
    ipHash: ctx.ipHash,
  });
  return { revokedSessions };
}

/**
 * Delete a team member (needs `user:delete`, super admins only by default).
 *
 * The row is kept — soft delete — because notes, timeline entries, payments
 * and the audit log reference their author. The account is disabled for
 * good, signed out everywhere, its email and phone are released (so the
 * address can be used again), and their open enquiries and tasks become
 * unassigned. The name stays so history still reads correctly.
 */
export async function deleteUser(
  actor: Actor,
  input: { userId: string; confirmEmail: string },
  ctx: RequestContext,
  now = new Date(),
): Promise<void> {
  authorize(actor, "user:delete");
  if (input.userId === actor.userId) throw new ServiceError("forbidden", "You can't delete your own account.");
  const target = await loadTarget(actor, input.userId);
  if (input.confirmEmail.trim().toLowerCase() !== target.email) {
    throw new ServiceError("confirmation_mismatch", "Type the person's email exactly to confirm.", {
      confirmEmail: ["Doesn't match their email."],
    });
  }
  if (target.role.key === SUPER_ADMIN) await assertNotLastSuperAdmin(target.id);

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: {
        status: "DISABLED",
        deletedAt: now,
        email: `deleted+${target.id}@users.invalid`,
        phone: null,
        passwordHash: "!deleted",
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await tx.session.updateMany({ where: { userId: target.id, revokedAt: null }, data: { revokedAt: now } });

    const owned = await tx.enquiry.findMany({
      where: { ownerId: target.id, status: { notIn: ["CONFIRMED", "LOST", "CANCELLED"] } },
      select: { id: true },
    });
    if (owned.length) {
      await tx.enquiry.updateMany({ where: { id: { in: owned.map((e) => e.id) } }, data: { ownerId: null, updatedById: actor.userId } });
      await tx.enquiryActivity.createMany({
        data: owned.map((e) => ({
          enquiryId: e.id,
          actorId: actor.userId,
          type: "ASSIGNED" as const,
          summary: `Unassigned — ${target.name}'s account was deleted`,
        })),
      });
    }
    await tx.task.updateMany({ where: { assigneeId: target.id, status: { notIn: ["DONE", "CANCELLED"] } }, data: { assigneeId: null } });
    await tx.notification.deleteMany({ where: { recipientId: target.id } });

    await audit(
      {
        actorId: actor.userId,
        action: "user.deleted",
        entityType: "User",
        entityId: target.id,
        before: { name: target.name, email: maskEmail(target.email), role: target.role.key },
        after: { unassignedEnquiries: owned.length },
        ipHash: ctx.ipHash,
      },
      tx,
    );
  });
}
