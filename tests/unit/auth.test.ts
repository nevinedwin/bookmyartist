import { describe, expect, it } from "vitest";
import { formatBudget } from "@/components/desk/format";
import { businessDayEnd, businessLocalToUtc, utcToBusinessLocal } from "@/lib/time";
import { changePasswordSchema, loginSchema, passwordSchema, safeAdminRedirect } from "@/lib/validation/auth";
import { type Actor, AuthorizationError, authorize, can } from "@/server/auth/actor";
import { ALL_PERMISSIONS, SYSTEM_ROLES } from "@/server/auth/permissions";
import { phoneSchema } from "@/lib/validation/users";

describe("password policy", () => {
  it("accepts long passphrases and rejects short, common or repetitive ones", () => {
    expect(passwordSchema.safeParse("correct horse battery staple").success).toBe(true);
    expect(passwordSchema.safeParse("short-pass1").success).toBe(false);
    expect(passwordSchema.safeParse("Password12345").success).toBe(false);
    expect(passwordSchema.safeParse("aaaaaaaaaaaaaaab").success).toBe(false);
    expect(passwordSchema.safeParse("x".repeat(129)).success).toBe(false);
  });

  it("requires matching confirmation and a new password", () => {
    const base = { currentPassword: "old passphrase here", newPassword: "a fresh passphrase", confirmPassword: "a fresh passphrase" };
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
    expect(changePasswordSchema.safeParse({ ...base, confirmPassword: "different" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...base, newPassword: base.currentPassword, confirmPassword: base.currentPassword }).success).toBe(
      false,
    );
  });

  it("normalises login emails", () => {
    expect(loginSchema.parse({ email: "  Ops@Agency.IN ", password: "x" }).email).toBe("ops@agency.in");
  });
});

describe("safeAdminRedirect (open-redirect guard)", () => {
  it.each([
    ["/admin/enquiries?status=NEW", "/admin/enquiries?status=NEW"],
    ["/admin", "/admin"],
    [undefined, "/admin"],
    ["https://evil.example/admin", "/admin"],
    ["//evil.example/admin", "/admin"],
    ["/\\evil.example", "/admin"],
    ["/artists", "/admin"],
    ["/admin/login", "/admin"],
    ["/admin\\@evil.example", "/admin"],
  ])("%s → %s", (input, expected) => {
    expect(safeAdminRedirect(input)).toBe(expected);
  });
});

describe("RBAC helpers", () => {
  const actor = (permissions: readonly string[]): Actor => ({
    userId: "u",
    sessionId: "s",
    name: "Test",
    email: "t@example.invalid",
    roleKey: "X",
    roleName: "X",
    mustChangePassword: false,
    permissions: new Set(permissions) as Actor["permissions"],
  });

  it("checks permissions, not role names", () => {
    const staff = actor(SYSTEM_ROLES.STAFF.permissions);
    expect(can(staff, "enquiry:write")).toBe(true);
    expect(can(staff, "artist:internal")).toBe(false);
    expect(() => authorize(staff, "finance:read")).toThrow(AuthorizationError);
  });

  it("keeps confidential data away from staff and user management with admins only", () => {
    expect(SYSTEM_ROLES.STAFF.permissions).not.toContain("artist:internal");
    expect(SYSTEM_ROLES.STAFF.permissions).not.toContain("finance:read");
    for (const role of ["MANAGER", "STAFF", "FINANCE"] as const) {
      expect(SYSTEM_ROLES[role].permissions).not.toContain("user:manage");
    }
    expect(SYSTEM_ROLES.SUPER_ADMIN.permissions).toEqual(ALL_PERMISSIONS);
    expect(SYSTEM_ROLES.ADMIN.permissions).not.toContain("user:delete");
    expect(SYSTEM_ROLES.ADMIN.permissions).toContain("user:manage");
  });
});

describe("business-time helpers", () => {
  it("round-trips datetime-local values in IST", () => {
    const utc = businessLocalToUtc("2027-02-14T19:30");
    expect(utc.toISOString()).toBe("2027-02-14T14:00:00.000Z");
    expect(utcToBusinessLocal(utc)).toBe("2027-02-14T19:30");
    expect(() => businessLocalToUtc("14/02/2027 7pm")).toThrow(RangeError);
  });

  it("finds the end of the IST day", () => {
    // 20:00 UTC on 1 Jan is already 2 Jan in India.
    expect(businessDayEnd(new Date("2027-01-01T20:00:00Z")).toISOString()).toBe("2027-01-02T18:29:59.999Z");
  });
});

describe("formatBudget", () => {
  it("formats ranges compactly", () => {
    expect(formatBudget("10000000", "30000000")).toBe("₹1L – ₹3L");
    expect(formatBudget("0", "5000000")).toBe("Up to ₹50K");
    expect(formatBudget("50000000", null)).toBe("From ₹5L");
    expect(formatBudget(null, null)).toBeNull();
  });
});

describe("phoneSchema", () => {
  it.each([
    ["98765 43210", "+919876543210"],
    ["+91 98765-43210", "+919876543210"],
    ["0044 20 7946 0958", "+442079460958"],
    ["+1 (415) 555-0100", "+14155550100"],
    ["", null],
  ])("%s → %s", (input, expected) => {
    expect(phoneSchema.parse(input)).toBe(expected);
  });

  it.each(["12345", "+91 12345 67890", "phone", "9876543210123456"])("rejects %s", (input) => {
    expect(phoneSchema.safeParse(input).success).toBe(false);
  });
});
