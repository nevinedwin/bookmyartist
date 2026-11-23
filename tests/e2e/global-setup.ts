import { Client } from "pg";

/** Clear rate-limit buckets in the e2e database so repeated local runs aren't throttled. */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://encore:encore_dev_password@localhost:5433/encore_test";
  if (!url.includes("test")) throw new Error("E2E must run against a test database");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('DELETE FROM "RateLimitBucket"');
  } catch {
    // Table may not exist before the first migration; the web server migrates on start.
  } finally {
    await client.end();
  }
}
