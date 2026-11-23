import { type Browser, type Page, expect, test } from "@playwright/test";
import { Client } from "pg";
import { E2E_PASSWORD } from "./accounts";

/*
 * Phase 4 journeys: artists (with live catalogue invalidation), clients and
 * tasks. All names are fictional and suffixed so reruns don't collide.
 */

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://encore:encore_dev_password@localhost:5433/encore_test";
const suffix = () => Math.random().toString(36).slice(2, 7);

/*
 * Every e2e sign-in comes from localhost, which shares the per-IP sign-in
 * limit with admin.spec. Sign in once per account and project, then reuse the
 * session cookie for each test.
 */
const sessions = new Map<string, Awaited<ReturnType<Awaited<ReturnType<Browser["newContext"]>>["storageState"]>>>();

async function signIn(page: Page, email: string) {
  const key = `${test.info().project.name}:${email}`;
  const saved = sessions.get(key);
  if (saved) {
    await page.context().addCookies(saved.cookies);
    await page.goto("/admin");
  } else {
    await page.goto("/admin/login");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
  }
  await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E");
  if (!saved) sessions.set(key, await page.context().storageState());
}

async function insertEnquiry(name: string, email: string, phone: string): Promise<string> {
  const client = new Client({ connectionString: TEST_DB });
  await client.connect();
  try {
    const ref = `ENQ-2099-${String(Math.floor(Math.random() * 900000) + 100000)}`;
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO "Enquiry" (id, reference, source, "contactName", "contactEmail", "contactPhone", "eventType", "eventDate", "eventCity", "updatedAt")
       VALUES (gen_random_uuid(), $1, 'BOOKING_FORM', $2, $3, $4, 'CORPORATE', '2027-04-01', 'Pune', now()) RETURNING id`,
      [ref, name, email, phone],
    );
    return rows[0]!.id;
  } finally {
    await client.end();
  }
}

test.describe("artists", () => {
  test.skip(({ isMobile }) => isMobile, "Long form journey runs on desktop; mobile layout is covered below.");

  test("add, publish, edit and unpublish an artist — the website follows immediately", async ({ page }) => {
    const name = `E2E Quartet ${suffix()}`;
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    await signIn(page, "e2e-admin@example.invalid");

    await page.goto("/admin/artists/new");
    await page.getByLabel("Stage name").fill(name);
    await expect(page.getByText(`/artists/${slug}`)).toBeVisible();
    await page.getByLabel("Category").selectOption({ index: 1 });
    await page.getByLabel("Base city").fill("Pune");
    await page.getByLabel("Short bio").fill("A fictional string quartet used only by tests.");
    await page.getByLabel("Biography").fill("A fictional string quartet used only by the end-to-end tests. It does not exist.");
    await page.getByLabel("Wedding").check();
    await page.getByRole("button", { name: "Add artist" }).click();

    await expect(page).toHaveURL(/\/admin\/artists\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByText("Inactive").first()).toBeVisible();

    // Hidden until published: real 404 on the website.
    expect((await page.request.get(`/artists/${slug}`)).status()).toBe(404);

    await page.getByLabel("Status").selectOption("ACTIVE");
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByRole("link", { name: /View on website/ })).toBeVisible();

    const live = await page.request.get(`/artists/${slug}`);
    expect(live.status()).toBe(200);
    expect(await live.text()).toContain(name);

    await page.getByLabel("Tagline").fill("Strings for unforgettable evenings");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved")).toBeVisible();
    expect(await (await page.request.get(`/artists/${slug}`)).text()).toContain("Strings for unforgettable evenings");

    await page.getByLabel("Status").selectOption("ON_HOLD");
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByRole("link", { name: /View on website/ })).toHaveCount(0);
    expect((await page.request.get(`/artists/${slug}`)).status()).toBe(404);

    // Added by mistake and never enquired about: an admin can remove it for good.
    await page.getByRole("button", { name: "Delete artist" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Delete permanently" })).toBeDisabled();
    await dialog.getByLabel(/to confirm/).fill(name);
    await dialog.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page).toHaveURL(/\/admin\/artists$/);
    await expect(page.getByText(`${name} deleted`)).toBeVisible();
  });

  test("private rates are hidden from staff, who can't edit artists", async ({ page }) => {
    await signIn(page, "e2e-desk@example.invalid");
    await page.goto("/admin/artists");
    await expect(page.getByRole("heading", { level: 1, name: "Artists" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Add artist" })).toHaveCount(0);
    await page.locator("tbody a").first().click();
    await expect(page.getByRole("region", { name: "Profile" })).toBeVisible();
    await expect(page.getByText("Private details")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save profile" })).toHaveCount(0);

    await page.goto("/admin/artists/new");
    await expect(page.getByText("You don't have access")).toBeVisible();
  });
});

test.describe("clients and tasks", () => {
  test("link an enquiry to a new client, add a task and complete it", async ({ page }) => {
    const name = `E2E Client ${suffix()}`;
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.invalid`;
    const enquiryId = await insertEnquiry(name, email, `+9198765${String(Math.floor(Math.random() * 90000) + 10000)}`);
    await signIn(page, "e2e-desk@example.invalid");

    await page.goto(`/admin/enquiries/${enquiryId}`);
    await page.getByRole("button", { name: "New client from this enquiry" }).click();
    await expect(page.getByText("Client created and linked")).toBeVisible();
    const clientLink = page.getByRole("link", { name });
    await expect(clientLink).toBeVisible();
    await expect(page.getByText(`Created client ${name} from this enquiry`)).toBeVisible();

    await page.getByRole("button", { name: "Add task" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Task").fill("Send the quartet's repertoire");
    await dialog.getByRole("button", { name: "Add task" }).click();
    await expect(page.getByText("Task added")).toBeVisible();
    const tasks = page.getByRole("region", { name: "Tasks" });
    await expect(tasks.getByText("Send the quartet's repertoire")).toBeVisible();

    await tasks.getByRole("button", { name: "Mark “Send the quartet's repertoire” done" }).click();
    await expect(tasks.getByText("Done", { exact: true })).toBeVisible();

    await clientLink.click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByRole("complementary").getByText("Pune")).toBeVisible();
  });

  test("creating a client with a known email offers the existing record first", async ({ page }) => {
    const name = `E2E Dup ${suffix()}`;
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.invalid`;
    await signIn(page, "e2e-desk@example.invalid");
    await page.goto("/admin/clients");

    for (const attempt of [1, 2]) {
      await page.getByRole("button", { name: "New client" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Name").fill(name);
      await dialog.getByLabel("Email").fill(email);
      await dialog.getByRole("button", { name: "Create client" }).click();
      if (attempt === 1) {
        await expect(page).toHaveURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
        await page.goto("/admin/clients");
      } else {
        await expect(dialog.getByText("This may already be a client")).toBeVisible();
        await expect(dialog.getByRole("link", { name })).toBeVisible();
      }
    }
  });

  test("the task list filters by assignee through the URL", async ({ page }) => {
    await signIn(page, "e2e-desk@example.invalid");
    await page.goto("/admin/tasks");
    await expect(page.getByRole("heading", { level: 1, name: "Tasks" })).toBeVisible();
    await page.getByRole("combobox", { name: "Assignee" }).selectOption("me");
    await expect(page).toHaveURL(/assignee=me/);
  });
});

test.describe("enquiry edit and delete", () => {
  test("an admin corrects an enquiry, then deletes it", async ({ page }) => {
    const name = `E2E Spam ${suffix()}`;
    const id = await insertEnquiry(name, `${suffix()}@example.invalid`, "+919876501111");
    await signIn(page, "e2e-admin@example.invalid");
    await page.goto(`/admin/enquiries/${id}`);

    await page.getByRole("button", { name: "Edit details" }).click();
    const edit = page.getByRole("dialog");
    await edit.getByLabel("City").fill("Nashik");
    await edit.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Enquiry updated")).toBeVisible();
    await expect(page.getByText("Details edited: city Pune → Nashik")).toBeVisible();

    const reference = (await page.locator("header .font-mono").first().textContent())!.trim();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const del = page.getByRole("dialog");
    await del.getByLabel(/to confirm/).fill(reference);
    await del.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page).toHaveURL(/\/admin\/enquiries$/);
    await expect(page.getByText(`${reference} deleted`)).toBeVisible();
    await page.goto(`/admin/enquiries/${id}`);
    await expect(page.getByText("Enquiry not found").first()).toBeVisible();
  });

  test("staff can edit but don't see delete", async ({ page }) => {
    const id = await insertEnquiry(`E2E Lead ${suffix()}`, `${suffix()}@example.invalid`, "+919876502222");
    await signIn(page, "e2e-desk@example.invalid");
    await page.goto(`/admin/enquiries/${id}`);
    await expect(page.getByRole("button", { name: "Edit details" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
  });
});
