import { type Page, expect, test } from "@playwright/test";
import { Client } from "pg";
import { E2E_PASSWORD } from "./accounts";

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://encore:encore_dev_password@localhost:5433/encore_test";

async function signIn(page: Page, email: string, password = E2E_PASSWORD) {
  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Insert a fictional enquiry directly (the public submission flow is covered in public-site.spec). */
async function insertEnquiry(name: string): Promise<string> {
  const client = new Client({ connectionString: TEST_DB });
  await client.connect();
  try {
    const ref = `ENQ-2099-${String(Math.floor(Math.random() * 900000) + 100000)}`;
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO "Enquiry" (id, reference, source, "contactName", "contactEmail", "contactPhone", "eventType", "eventDate", "eventCity", "updatedAt")
       VALUES (gen_random_uuid(), $1, 'BOOKING_FORM', $2, 'e2e.customer@example.invalid', '+919876543210', 'WEDDING', '2027-03-01', 'Jaipur', now())
       RETURNING id`,
      [ref, name],
    );
    await client.query(
      `INSERT INTO "EnquiryActivity" (id, "enquiryId", type, summary) VALUES (gen_random_uuid(), $1, 'CREATED', 'Enquiry submitted via booking form')`,
      [rows[0]!.id],
    );
    return rows[0]!.id;
  } finally {
    await client.end();
  }
}

test.describe("admin access", () => {
  test("anonymous visitors are sent to sign in and returned afterwards", async ({ page }) => {
    await page.goto("/admin/enquiries?owner=me");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fenquiries%3Fowner%3Dme/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    await page.getByLabel("Work email").fill("e2e-admin@example.invalid");
    await page.getByLabel("Password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/enquiries\?owner=me$/);
    await expect(page.getByRole("heading", { level: 1, name: "Enquiries" })).toBeVisible();
  });

  test("wrong password shows a generic error and keeps the email", async ({ page }) => {
    await signIn(page, "e2e-lockout@example.invalid", "definitely not it");
    await expect(page.locator("#login-error")).toHaveText("Incorrect email or password.");
    await expect(page.getByLabel("Work email")).toHaveValue("e2e-lockout@example.invalid");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("the session cookie is HttpOnly and SameSite=Lax; sign-out ends it", async ({ page, context }) => {
    await signIn(page, "e2e-admin@example.invalid");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E");
    const cookie = (await context.cookies()).find((c) => c.name.endsWith("bma_session"));
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
    expect(await page.evaluate(() => document.cookie)).not.toContain("bma_session");

    await page.goto("/admin/account");
    await page.getByRole("button", { name: /Open account menu/ }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);

    // The old cookie value must no longer work even if replayed.
    await context.addCookies([{ ...cookie!, expires: -1 }]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("staff cannot reach team management, and no user data is rendered", async ({ page }) => {
    await signIn(page, "e2e-staff@example.invalid");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E");
    await expect(page.getByRole("link", { name: "Team & access" })).toHaveCount(0);

    await page.goto("/admin/users");
    await expect(page.getByText("You don't have access").filter({ visible: true })).toBeVisible();
    expect(await page.content()).not.toContain("e2e-admin@example.invalid");
  });
});

test.describe("enquiry management", () => {
  test("staff triage an enquiry: log a call, add a note, mark it lost", async ({ page }) => {
    const name = `E2E Customer ${Date.now()}`;
    const id = await insertEnquiry(name);
    await signIn(page, "e2e-staff@example.invalid");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E");

    await page.goto(`/admin/enquiries?q=${encodeURIComponent(name)}`);
    await page.getByRole("link", { name }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/enquiries/${id}$`));
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

    await page.getByPlaceholder("What was discussed?").fill("Called about the date and budget");
    await page.getByRole("button", { name: "Log", exact: true }).click();
    await expect(page.getByText("Call: Called about the date and budget")).toBeVisible();
    await expect(page.getByText("New → Contacted (first contact logged)")).toBeVisible();

    await page.getByPlaceholder("Internal note — never shown to the customer").fill("Prefers a Rajasthani folk ensemble");
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText("Prefers a Rajasthani folk ensemble", { exact: true })).toBeVisible();

    await page.getByLabel("Move to").selectOption("LOST");
    await expect(page.getByRole("button", { name: "Move" })).toBeDisabled();
    await page.getByLabel("Why was it lost?").selectOption("BUDGET");
    await page.getByRole("button", { name: "Move" }).click();
    await expect(page.getByText("Contacted → Lost — Budget mismatch")).toBeVisible();
    await expect(page.getByText("Lost:", { exact: false })).toBeVisible();
  });
});

test.describe("team management", () => {
  test("a super admin deletes a member after typing their email", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop table layout");
    const email = `e2e-leaver-${Date.now()}@example.invalid`;
    const client = new Client({ connectionString: TEST_DB });
    await client.connect();
    try {
      await client.query(
        `INSERT INTO "User" (id, email, name, "passwordHash", "roleId", "updatedAt")
         SELECT gen_random_uuid(), $1, 'E2E Leaver', '!unusable', id, now() FROM "Role" WHERE key = 'STAFF'`,
        [email],
      );
    } finally {
      await client.end();
    }

    await signIn(page, "e2e-admin@example.invalid");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E");
    await page.goto("/admin/users");
    const row = page.getByRole("row").filter({ hasText: email });
    await row.getByRole("button", { name: "Actions for E2E Leaver" }).click();
    await page.getByRole("menuitem", { name: "Delete account" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Delete account" })).toBeDisabled();
    await dialog.getByLabel(/Type .* to confirm/).fill(email);
    await dialog.getByRole("button", { name: "Delete account" }).click();
    await expect(page.getByText("E2E Leaver's account was deleted")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: email })).toHaveCount(0);
  });

  test("staff can update their own phone number", async ({ page }) => {
    await signIn(page, "e2e-staff@example.invalid");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E");
    await page.goto("/admin/account");
    await page.getByLabel(/Phone/).fill("98765 43210");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(/Phone/)).toHaveValue("+919876543210");
  });
});
