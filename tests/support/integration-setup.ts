import { execSync } from "node:child_process";

/**
 * Integration tests run against a dedicated database (never the dev or
 * production one). Migrations are applied before the suite starts.
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://encore:encore_dev_password@localhost:5433/encore_test";
  if (!/encore_test|_test\b|test/.test(new URL(url).pathname)) {
    throw new Error(`Refusing to run integration tests against non-test database: ${url}`);
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, DIRECT_DATABASE_URL: url },
  });
}
