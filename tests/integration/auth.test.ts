import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS } from "@/server/auth/cookie";
import { createSession, revokeSession, validateSessionToken } from "@/server/auth/session";
import { db } from "@/server/db";
import { authenticate, changeOwnPassword, INVALID_CREDENTIALS, MAX_FAILED_LOGINS, changeOwnEmail, updateOwnProfile } from "@/server/services/auth";
import { ServiceError } from "@/server/services/errors";
import { resetDatabase } from "../support/db";
import { actorFor, createTestUser, ctx, seedSystemRoles, TEST_PASSWORD } from "../support/auth";

async function failure(promise: Promise<unknown>): Promise<ServiceError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ServiceError) return error;
    throw error;
  }
  throw new Error("expected a ServiceError");
}

describe("authentication", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedSystemRoles();
  });
  afterAll(() => db.$disconnect());

  it("signs in with correct credentials and stores only a hash of the token", async () => {
    const user = await createTestUser("STAFF", { email: "staff@example.invalid" });
    const { session } = await authenticate("Staff@Example.invalid", TEST_PASSWORD, ctx);

    const stored = await db.session.findUniqueOrThrow({ where: { id: session.sessionId } });
    expect(stored.tokenHash).not.toBe(session.token);
    expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);

    const actor = await validateSessionToken(session.token);
    expect(actor?.userId).toBe(user.id);
    expect(actor?.permissions.has("enquiry:write")).toBe(true);
    expect(actor?.permissions.has("finance:read")).toBe(false);
    expect(await db.auditLog.count({ where: { action: "auth.login", actorId: user.id } })).toBe(1);
  });

  it("gives the same error for an unknown email and a wrong password", async () => {
    await createTestUser("STAFF", { email: "staff@example.invalid" });
    const unknown = await failure(authenticate("nobody@example.invalid", TEST_PASSWORD, ctx));
    const wrong = await failure(authenticate("staff@example.invalid", "not the password", ctx));
    expect(unknown.message).toBe(INVALID_CREDENTIALS);
    expect(wrong.message).toBe(INVALID_CREDENTIALS);
  });

  it(`locks the account after ${MAX_FAILED_LOGINS} failures, even for the right password`, async () => {
    const user = await createTestUser("STAFF", { email: "staff@example.invalid" });
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) {
      await failure(authenticate("staff@example.invalid", "wrong password!", ctx));
    }
    const locked = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(locked.lockedUntil?.getTime()).toBeGreaterThan(Date.now());

    const err = await failure(authenticate("staff@example.invalid", TEST_PASSWORD, ctx));
    expect(err.message).toBe(INVALID_CREDENTIALS);
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);

    // After the lock expires the right password works again.
    const later = new Date(Date.now() + 16 * 60 * 1000);
    await expect(authenticate("staff@example.invalid", TEST_PASSWORD, ctx, later)).resolves.toBeDefined();
  });

  it("refuses disabled accounts", async () => {
    const user = await createTestUser("STAFF", { email: "staff@example.invalid" });
    await db.user.update({ where: { id: user.id }, data: { status: "DISABLED" } });
    await failure(authenticate("staff@example.invalid", TEST_PASSWORD, ctx));
  });

  it("expires sessions on idle timeout, absolute lifetime, revocation and disablement", async () => {
    const user = await createTestUser("STAFF");
    const now = new Date();

    const idle = await createSession(user.id, ctx, now);
    expect(await validateSessionToken(idle.token, new Date(now.getTime() + SESSION_IDLE_MS - 1000))).not.toBeNull();
    const idle2 = await createSession(user.id, ctx, now);
    expect(await validateSessionToken(idle2.token, new Date(now.getTime() + SESSION_IDLE_MS + 1000))).toBeNull();

    // Kept alive by activity, but still ends at the absolute limit.
    const active = await createSession(user.id, ctx, now);
    let t = now.getTime();
    while (t < now.getTime() + SESSION_ABSOLUTE_MS - SESSION_IDLE_MS / 2) {
      t += SESSION_IDLE_MS / 2;
      expect(await validateSessionToken(active.token, new Date(t))).not.toBeNull();
    }
    expect(await validateSessionToken(active.token, new Date(now.getTime() + SESSION_ABSOLUTE_MS + 1000))).toBeNull();

    const revoked = await createSession(user.id, ctx);
    await revokeSession(revoked.sessionId);
    expect(await validateSessionToken(revoked.token)).toBeNull();

    const live = await createSession(user.id, ctx);
    await db.user.update({ where: { id: user.id }, data: { status: "DISABLED" } });
    expect(await validateSessionToken(live.token)).toBeNull();
  });

  it("applies role changes on the next request with the same session", async () => {
    const user = await createTestUser("STAFF");
    const { token } = await createSession(user.id, ctx);
    expect((await validateSessionToken(token))?.permissions.has("finance:write")).toBe(false);

    const finance = await db.role.findUniqueOrThrow({ where: { key: "FINANCE" } });
    await db.user.update({ where: { id: user.id }, data: { roleId: finance.id } });
    const after = await validateSessionToken(token);
    expect(after?.permissions.has("finance:write")).toBe(true);
    expect(after?.permissions.has("enquiry:write")).toBe(false);
  });

  it("changing the password clears the temporary flag and signs out other sessions", async () => {
    const actor = await actorFor("STAFF", { mustChangePassword: true });
    expect(actor.mustChangePassword).toBe(true);
    const other = await createSession(actor.userId, ctx);

    const wrong = await failure(changeOwnPassword(actor, { currentPassword: "nope", newPassword: "a brand new passphrase" }, ctx));
    expect(wrong.code).toBe("invalid_password");

    const { revokedSessions } = await changeOwnPassword(
      actor,
      { currentPassword: TEST_PASSWORD, newPassword: "a brand new passphrase" },
      ctx,
    );
    expect(revokedSessions).toBe(1);
    expect(await validateSessionToken(other.token)).toBeNull();
    const user = await db.user.findUniqueOrThrow({ where: { id: actor.userId } });
    expect(user.mustChangePassword).toBe(false);
    expect(user.passwordChangedAt).not.toBeNull();
  });

  it("lets users edit their name and phone, audited with the phone masked", async () => {
    const actor = await actorFor("STAFF", { name: "Old Name" });
    await updateOwnProfile(actor, { name: "New Name", phone: "+919876543210" }, ctx);
    const user = await db.user.findUniqueOrThrow({ where: { id: actor.userId } });
    expect(user.name).toBe("New Name");
    expect(user.phone).toBe("+919876543210");
    const entry = await db.auditLog.findFirstOrThrow({ where: { action: "user.profile_updated", entityId: actor.userId } });
    expect(entry.before).toEqual({ name: "Old Name", phone: null });
    expect(entry.after).toEqual({ name: "New Name", phone: "+91******3210" });
  });

  it("changes the sign-in email only with the current password, and signs out other devices", async () => {
    const actor = await actorFor("STAFF", { email: "old@example.invalid" });
    await createTestUser("STAFF", { email: "taken@example.invalid" });
    const other = await createSession(actor.userId, ctx);

    expect((await failure(changeOwnEmail(actor, { email: "new@example.invalid", currentPassword: "wrong" }, ctx))).code).toBe("invalid_password");
    expect((await failure(changeOwnEmail(actor, { email: "taken@example.invalid", currentPassword: TEST_PASSWORD }, ctx))).code).toBe(
      "email_taken",
    );

    const { revokedSessions } = await changeOwnEmail(actor, { email: "new@example.invalid", currentPassword: TEST_PASSWORD }, ctx);
    expect(revokedSessions).toBe(1);
    expect(await validateSessionToken(other.token)).toBeNull();
    await expect(authenticate("new@example.invalid", TEST_PASSWORD, ctx)).resolves.toBeDefined();
    expect((await failure(authenticate("old@example.invalid", TEST_PASSWORD, ctx))).code).toBe("invalid_credentials");
    const entry = await db.auditLog.findFirstOrThrow({ where: { action: "user.email_changed" } });
    expect(JSON.stringify(entry)).not.toContain("new@example.invalid");
  });
});
