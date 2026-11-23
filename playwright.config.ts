import { defineConfig, devices } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "./tests/e2e/accounts";

/**
 * E2E tests run against a production build on port 3100, backed by the
 * dedicated `encore_test` database (migrated and seeded with demo data).
 */
const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://encore:encore_dev_password@localhost:5433/encore_test";
const PORT = 3100;



export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: [
      "npx prisma migrate deploy",
      "npx prisma db seed",
      // Fictional accounts; --reset makes reruns idempotent (and unlocks the lockout account).
      ...E2E_USERS.map((u) => `npx tsx scripts/create-admin.ts --email ${u.email} --name "${u.name}" --role ${u.role} --reset`),
      "npx next build",
      `npx next start -p ${PORT}`,
    ].join(" && "),
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: TEST_DB,
      DIRECT_DATABASE_URL: TEST_DB,
      SEED_DEMO: "true",
      ADMIN_PASSWORD: E2E_PASSWORD,
      APP_SECRET: process.env.APP_SECRET ?? "e2e-test-secret-0123456789abcdef0123456",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
    },
  },
});
