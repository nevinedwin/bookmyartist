import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { AuthorizationError } from "@/server/auth/actor";
import { validateSessionToken } from "@/server/auth/session";
import { db } from "@/server/db";
import {
  changeUserRole,
  createUser,
  deleteUser,
  listUsers,
  resetUserPassword,
  setUserStatus,
  updateUserDetails,
} from "@/server/services/admin/users";
import { authenticate } from "@/server/services/auth";
import { createSession } from "@/server/auth/session";
import { assignEnquiryOwner } from "@/server/services/admin/enquiries";
import { resetDatabase } from "../support/db";
import { actorFor, createTestUser, ctx, seedSystemRoles } from "../support/auth";

describe("user management (RBAC)", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedSystemRoles();
  });
  afterAll(() => db.$disconnect());

  it("requires user:manage", async () => {
    for (const role of ["STAFF", "MANAGER", "FINANCE"] as const) {
      const actor = await actorFor(role);
      await expect(listUsers(actor)).rejects.toBeInstanceOf(AuthorizationError);
      await expect(createUser(actor, { name: "X", email: "x@example.invalid", roleKey: "STAFF" }, ctx)).rejects.toBeInstanceOf(
        AuthorizationError,
      );
    }
  });

  it("creates a user whose one-time temporary password works and must be changed", async () => {
    const admin = await actorFor("ADMIN");
    const { userId, temporaryPassword } = await createUser(admin, { name: "New Staff", email: "new@example.invalid", roleKey: "STAFF" }, ctx);
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.passwordHash).not.toContain(temporaryPassword);
    expect(user.mustChangePassword).toBe(true);

    const { session } = await authenticate("new@example.invalid", temporaryPassword, ctx);
    expect((await validateSessionToken(session.token))?.mustChangePassword).toBe(true);
    expect(await db.auditLog.count({ where: { action: "user.created", entityId: userId } })).toBe(1);
  });

  it("stops admins escalating to super admin or touching super admins", async () => {
    const admin = await actorFor("ADMIN");
    const superAdmin = await createTestUser("SUPER_ADMIN");
    const staff = await createTestUser("STAFF");

    await expect(createUser(admin, { name: "Sneaky", email: "s@example.invalid", roleKey: "SUPER_ADMIN" }, ctx)).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(changeUserRole(admin, { userId: staff.id, roleKey: "SUPER_ADMIN" }, ctx)).rejects.toMatchObject({ code: "forbidden" });
    await expect(setUserStatus(admin, { userId: superAdmin.id, status: "DISABLED" }, ctx)).rejects.toMatchObject({ code: "forbidden" });
    await expect(resetUserPassword(admin, { userId: superAdmin.id }, ctx)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("blocks self-demotion and self-disabling, so a super admin always remains", async () => {
    const root = await actorFor("SUPER_ADMIN");
    await expect(setUserStatus(root, { userId: root.userId, status: "DISABLED" }, ctx)).rejects.toMatchObject({ code: "forbidden" });
    await expect(changeUserRole(root, { userId: root.userId, roleKey: "STAFF" }, ctx)).rejects.toMatchObject({ code: "forbidden" });

    // With two super admins, one may demote the other.
    const second = await createTestUser("SUPER_ADMIN");
    await changeUserRole(root, { userId: second.id, roleKey: "ADMIN" }, ctx);
    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "user.role_changed", entityId: second.id } });
    expect(audit.before).toEqual({ role: "SUPER_ADMIN" });
    expect(audit.after).toEqual({ role: "ADMIN" });
  });

  it("disabling and resetting a password end the user's sessions immediately", async () => {
    const admin = await actorFor("ADMIN");
    const staff = await createTestUser("STAFF");
    const s1 = await createSession(staff.id, ctx);
    await resetUserPassword(admin, { userId: staff.id }, ctx);
    expect(await validateSessionToken(s1.token)).toBeNull();

    await db.user.update({ where: { id: staff.id }, data: { mustChangePassword: false } });
    const s2 = await createSession(staff.id, ctx);
    await setUserStatus(admin, { userId: staff.id, status: "DISABLED" }, ctx);
    expect(await validateSessionToken(s2.token)).toBeNull();
    expect(await db.session.count({ where: { userId: staff.id, revokedAt: null } })).toBe(0);
  });

  it("lets admins edit a member's details; an email change signs them out", async () => {
    const admin = await actorFor("ADMIN");
    const staff = await createTestUser("STAFF", { email: "before@example.invalid" });
    await createTestUser("STAFF", { email: "taken@example.invalid" });
    const session = await createSession(staff.id, ctx);

    await expect(
      updateUserDetails(admin, { userId: staff.id, name: "X", email: "taken@example.invalid", phone: null }, ctx),
    ).rejects.toMatchObject({ code: "email_taken" });

    const r1 = await updateUserDetails(admin, { userId: staff.id, name: "Renamed", email: "before@example.invalid", phone: "+919811122233" }, ctx);
    expect(r1.revokedSessions).toBe(0);
    expect(await validateSessionToken(session.token)).not.toBeNull();

    const r2 = await updateUserDetails(admin, { userId: staff.id, name: "Renamed", email: "after@example.invalid", phone: "+919811122233" }, ctx);
    expect(r2.revokedSessions).toBe(1);
    expect(await validateSessionToken(session.token)).toBeNull();
    const user = await db.user.findUniqueOrThrow({ where: { id: staff.id } });
    expect(user).toMatchObject({ name: "Renamed", email: "after@example.invalid", phone: "+919811122233" });

    const staffActor = await actorFor("STAFF");
    await expect(
      updateUserDetails(staffActor, { userId: staff.id, name: "Nope", email: "after@example.invalid", phone: null }, ctx),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("only super admins can delete, with typed-email confirmation", async () => {
    const admin = await actorFor("ADMIN");
    const root = await actorFor("SUPER_ADMIN");
    const staff = await createTestUser("STAFF", { email: "leaver@example.invalid", name: "Leaver" });

    await expect(deleteUser(admin, { userId: staff.id, confirmEmail: "leaver@example.invalid" }, ctx)).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    await expect(deleteUser(root, { userId: root.userId, confirmEmail: root.email }, ctx)).rejects.toMatchObject({ code: "forbidden" });
    await expect(deleteUser(root, { userId: staff.id, confirmEmail: "wrong@example.invalid" }, ctx)).rejects.toMatchObject({
      code: "confirmation_mismatch",
    });
  });

  it("deleting keeps history, frees the email, ends access and unassigns open enquiries", async () => {
    const root = await actorFor("SUPER_ADMIN");
    const staff = await createTestUser("STAFF", { email: "leaver@example.invalid", name: "Leaver" });
    const session = await createSession(staff.id, ctx);
    await db.businessSettings.create({ data: { id: 1, agencyName: "Test" } });
    const enquiry = await db.enquiry.create({
      data: {
        reference: "ENQ-2099-000001",
        source: "PHONE",
        contactName: "Fictional Client",
        contactEmail: "client@example.invalid",
        contactPhone: "+919800000000",
        eventType: "WEDDING",
        eventDate: new Date("2027-01-01"),
        eventCity: "Pune",
      },
    });
    await assignEnquiryOwner(root, { enquiryId: enquiry.id, ownerId: staff.id });
    await db.enquiryNote.create({ data: { enquiryId: enquiry.id, authorId: staff.id, body: "Spoke to the client" } });

    await deleteUser(root, { userId: staff.id, confirmEmail: "Leaver@example.invalid" }, ctx);

    expect(await validateSessionToken(session.token)).toBeNull();
    const deleted = await db.user.findUniqueOrThrow({ where: { id: staff.id } });
    expect(deleted.deletedAt).not.toBeNull();
    expect(deleted.status).toBe("DISABLED");
    expect(deleted.email).not.toBe("leaver@example.invalid");
    expect(deleted.name).toBe("Leaver");
    expect((await db.enquiry.findUniqueOrThrow({ where: { id: enquiry.id } })).ownerId).toBeNull();
    expect(await db.enquiryNote.count({ where: { authorId: staff.id } })).toBe(1);
    expect((await listUsers(root)).map((u) => u.id)).not.toContain(staff.id);

    // The address is free again, and the deleted account can't be touched.
    await expect(createUser(root, { name: "Rehire", email: "leaver@example.invalid", roleKey: "STAFF" }, ctx)).resolves.toBeDefined();
    await expect(setUserStatus(root, { userId: staff.id, status: "ACTIVE" }, ctx)).rejects.toMatchObject({ code: "not_found" });
  });
});
