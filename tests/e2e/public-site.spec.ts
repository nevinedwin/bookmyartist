import { expect, test } from "@playwright/test";

test.describe("public website", () => {
  test("home page presents the brand, featured artists and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Every Celebration Deserves Its Own Soundtrack.");
    await expect(page.getByRole("link", { name: /Explore artists/ }).first()).toBeVisible();
    await expect(page.locator("#featured-artists article").first()).toBeVisible();
  });

  test("artist directory filters by category via the URL", async ({ page }) => {
    await page.goto("/artists?category=djs");
    const cards = page.locator("main ul article");
    await expect(cards.first()).toBeVisible();
    for (const label of await cards.locator("span.uppercase").first().allTextContents()) {
      expect(label.toLowerCase()).toContain("dj");
    }
  });

  test("artist profile never exposes confidential data", async ({ page, request }) => {
    const html = await (await request.get("/artists/aanya-rao")).text();
    expect(html).toContain("Aanya Rao");
    // Seeded ArtistInternal values that must never be public.
    expect(html).not.toContain("example.invalid");
    expect(html).not.toContain("Demo artist — fictional record");
    expect(html).not.toContain("basePricePaise");
    expect(html).not.toContain("commissionRateBps");

    await page.goto("/artists/aanya-rao");
    await expect(page.getByRole("heading", { level: 1, name: "Aanya Rao" })).toBeVisible();
    await page.getByRole("link", { name: /Enquire about Aanya/ }).click();
    await expect(page).toHaveURL(/book-an-artist\?artist=aanya-rao/);
  });

  test("unknown pages return 404", async ({ request }) => {
    expect((await request.get("/artists/does-not-exist")).status()).toBe(404);
    expect((await request.get("/services/does-not-exist")).status()).toBe(404);
  });
});

test.describe("booking enquiry", () => {
  test("visitor completes the 4-step wizard and receives a reference", async ({ page }) => {
    await page.goto("/book-an-artist?artist=dj-nightshift");
    await page.getByText("Wedding", { exact: true }).click();
    await page.fill('input[name="eventDate"]', `${new Date().getFullYear() + 1}-02-14`);
    await page.fill('input[name="eventCity"]', "Udaipur");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.locator('select[name="artistSlug"]')).toHaveValue("dj-nightshift");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.fill('input[name="name"]', "E2E Visitor");
    await page.fill('input[name="email"]', "e2e.visitor@example.com");
    await page.fill('input[name="phone"]', "9876543210");
    await page.check('input[name="consent"]');
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Check and send")).toBeVisible();
    await expect(page.getByText("DJ Nightshift")).toBeVisible();
    // The signed form token enforces a minimum fill time.
    await page.waitForTimeout(3200);
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByText(/ENQ-\d{4}-\d{6}/)).toBeVisible({ timeout: 15_000 });
  });

  test("step validation blocks progress with accessible errors", async ({ page }) => {
    await page.goto("/book-an-artist");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Please choose the type of event" })).toBeVisible();
    await expect(page.locator('input[name="eventCity"]')).toHaveAttribute("aria-invalid", "true");
  });

  test("API rejects cross-origin and malformed submissions", async ({ request }) => {
    const cross = await request.post("/api/enquiries", { headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, data: {} });
    expect(cross.status()).toBe(403);
    const invalid = await request.post("/api/enquiries", { data: { name: "x" } });
    expect(invalid.status()).toBe(422);
    const body = await invalid.json();
    expect(body.ok).toBe(false);
    expect(JSON.stringify(body)).not.toContain("stack");
  });
});
