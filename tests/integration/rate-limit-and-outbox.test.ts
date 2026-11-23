import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { deliverPendingEmails } from "@/server/email/outbox";
import { rateLimit } from "@/server/security/rate-limit";
import { resetDatabase } from "../support/db";

describe("rateLimit", () => {
  beforeEach(resetDatabase);
  afterAll(() => db.$disconnect());

  it("allows up to the limit within a window, then blocks", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit("test", "ip-1", 3, 600));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect((await rateLimit("test", "ip-2", 3, 600)).allowed).toBe(true);
  });

  it("is atomic under concurrent requests", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => rateLimit("burst", "ip", 5, 600)));
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
  });
});

describe("email outbox", () => {
  beforeEach(resetDatabase);

  it("marks messages SKIPPED (never SENT) when no provider is configured", async () => {
    await db.emailMessage.create({
      data: { template: "enquiry.received", toAddress: "a@example.invalid", subject: "s", payload: { reference: "ENQ-2026-000001", name: "A", eventType: "Wedding", eventDate: "1 Jan 2027", eventCity: "Pune", email: "a@example.invalid", phone: "+91", source: "Booking form", adminUrl: "http://x" } },
    });
    const report = await deliverPendingEmails();
    expect(report).toEqual({ sent: 0, failed: 0, skipped: 1 });
    const msg = await db.emailMessage.findFirstOrThrow();
    expect(msg.status).toBe("SKIPPED");
    expect(msg.lastError).toMatch(/not configured/);
  });

  it("fails unknown templates permanently", async () => {
    await db.emailMessage.create({ data: { template: "nope", toAddress: "a@example.invalid", subject: "s", payload: {} } });
    const report = await deliverPendingEmails();
    expect(report.failed).toBe(1);
    expect((await deliverPendingEmails()).failed).toBe(0); // not retried
  });
});
