import { seedRoles } from "../../prisma/seed/roles";
import type { Actor } from "@/server/auth/actor";
import { hashPassword } from "@/server/auth/password";
import { createSession, validateSessionToken } from "@/server/auth/session";
import { db } from "@/server/db";
import type { SystemRoleKey } from "@/server/auth/permissions";

export const TEST_PASSWORD = "correct horse battery staple";
export const ctx = { ipHash: "test-ip-hash", userAgent: "vitest" };

let cachedHash: string | undefined;

export async function seedSystemRoles() {
  const log = console.log;
  console.log = () => {};
  try {
    await seedRoles(db as never);
  } finally {
    console.log = log;
  }
}

/** Create a user with a system role (fictional data only). */
export async function createTestUser(role: SystemRoleKey, overrides: { email?: string; name?: string; mustChangePassword?: boolean } = {}) {
  cachedHash ??= await hashPassword(TEST_PASSWORD);
  const roleRow = await db.role.findUniqueOrThrow({ where: { key: role } });
  return db.user.create({
    data: {
      email: overrides.email ?? `${role.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}@example.invalid`,
      name: overrides.name ?? `Test ${role}`,
      passwordHash: cachedHash,
      roleId: roleRow.id,
      mustChangePassword: overrides.mustChangePassword ?? false,
    },
  });
}

/** A real Actor, built through the same session path the app uses. */
export async function actorFor(role: SystemRoleKey, overrides: Parameters<typeof createTestUser>[1] = {}): Promise<Actor> {
  const user = await createTestUser(role, overrides);
  const session = await createSession(user.id, ctx);
  const actor = await validateSessionToken(session.token);
  if (!actor) throw new Error("session did not validate");
  return actor;
}
