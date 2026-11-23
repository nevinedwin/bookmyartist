import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  // `server-only` throws outside React Server Components; tests run in plain Node.
  "server-only": fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url)),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
          env: { APP_SECRET: "unit-test-secret-0123456789abcdef0123", DATABASE_URL: "postgresql://unused:unused@localhost:1/unused" },
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/support/integration-setup.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
          env: {
            APP_SECRET: "integration-test-secret-0123456789abcdef",
            DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://encore:encore_dev_password@localhost:5433/encore_test",
            NODE_ENV: "test",
          },
        },
      },
    ],
  },
});
