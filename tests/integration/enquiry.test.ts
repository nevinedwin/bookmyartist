import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { publicEnquirySchema } from "@/lib/validation/enquiry";
import { db } from "@/server/db";
import { createPublicEnquiry } from "@/server/services/public/enquiries";
import { resetDatabase, seedMinimalCatalogue } from "../support/db";

const input = (overrides: Record<string, unknown> = {}) =>
  publicEnquirySchema("2026-01-01").parse({
    eventType: "WEDDING",
    eventDate: "2027-02-14",
    eventCity: "Udaipur",
    name: "Test Customer",
    email: "customer@example.com",
    phoneCountryCode: "+91",
    phone: "9876543210",
    consent: true,
    formToken: "unused-in-service",
    source: "ARTIST_PROFILE",
    sourcePath: "/artists/test-artist",
    artistSlug: "test-artist",
    budget: "1l-3l",
    ...overrides,
  });

const ctx = { ipHash: "hash", userAgent: "vitest" };

describe("createPublicEnquiry", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedMinimalCatalogue();
  });
  afterAll(() => db.$disconnect());

  it("persists the enquiry with reference, artist link, timeline, notifications and queued emails", async () => {
    const { reference } = await createPublicEnquiry(input(), ctx);
    expect(reference).toMatch(/^ENQ-\d{4}-000001$/);

    const enquiry = await db.enquiry.findUniqueOrThrow({
      where: { reference },
      include: { artists: true, activities: true },
    });
    expect(enquiry.status).toBe("NEW");
    expect(enquiry.source).toBe("ARTIST_PROFILE");
    expect(enquiry.contactPhone).toBe("+919876543210");
    expect(enquiry.eventDate.toISOString().slice(0, 10)).toBe("2027-02-14");
    expect(enquiry.budgetMinPaise).toBe(10_000_000n);
    expect(enquiry.budgetMaxPaise).toBe(30_000_000n);
    expect(enquiry.categoryId).not.toBeNull();
    expect(enquiry.artists).toHaveLength(1);
    expect(enquiry.artists[0]?.role).toBe("PREFERRED");
    expect(enquiry.activities.map((a) => a.type)).toEqual(["CREATED"]);

    expect(await db.notification.count({ where: { type: "enquiry.new" } })).toBe(1);
    const emails = await db.emailMessage.findMany({ orderBy: { template: "asc" } });
    expect(emails.map((e) => [e.template, e.toAddress])).toEqual([
      ["enquiry.new", "ops@example.invalid"],
      ["enquiry.received", "customer@example.com"],
    ]);
    expect(emails.every((e) => e.status === "PENDING")).toBe(true);
  });

  it("allocates sequential, unique references under concurrency", async () => {
    const refs = await Promise.all(Array.from({ length: 8 }, () => createPublicEnquiry(input(), ctx).then((r) => r.reference)));
    const numbers = refs.map((r) => Number(r.slice(-6))).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("auto-links an existing client only on an unambiguous contact match", async () => {
    const client = await db.client.create({ data: { name: "Existing", email: "customer@example.com" } });
    const { reference } = await createPublicEnquiry(input(), ctx);
    expect((await db.enquiry.findUniqueOrThrow({ where: { reference } })).clientId).toBe(client.id);

    await db.client.create({ data: { name: "Duplicate", phone: "+919876543210" } });
    const second = await createPublicEnquiry(input(), ctx);
    expect((await db.enquiry.findUniqueOrThrow({ where: { reference: second.reference } })).clientId).toBeNull();
  });

  it("ignores unknown or inactive artists instead of failing", async () => {
    await db.artist.update({ where: { slug: "test-artist" }, data: { status: "INACTIVE" } });
    const { reference } = await createPublicEnquiry(input(), ctx);
    const enquiry = await db.enquiry.findUniqueOrThrow({ where: { reference }, include: { artists: true } });
    expect(enquiry.artists).toHaveLength(0);
    expect(enquiry.sourceArtistId).toBeNull();
  });
});
