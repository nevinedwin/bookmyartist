/** Fictional e2e accounts, created in the test database by the Playwright web server command. */
export const E2E_PASSWORD = "e2e only passphrase 2026";
export const E2E_USERS = [
  { email: "e2e-admin@example.invalid", name: "E2E Admin", role: "SUPER_ADMIN" },
  { email: "e2e-staff@example.invalid", name: "E2E Staff", role: "STAFF" },
  { email: "e2e-lockout@example.invalid", name: "E2E Lockout", role: "STAFF" },
  // Used by admin-modules.spec so its sign-ins don't hit the per-account rate limit shared with admin.spec.
  { email: "e2e-desk@example.invalid", name: "E2E Desk", role: "STAFF" },
] as const;
