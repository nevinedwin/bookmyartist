import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Configure a fake WhatsApp provider before any module reads the environment.
vi.hoisted(() => {
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789";
});

import { publicEnquirySchema } from "@/lib/validation/enquiry";
import { alertSettingsSchema } from "@/lib/validation/settings";
import { db } from "@/server/db";
import { getAlertSettings, sendTestAlert, updateAlertSettings } from "@/server/services/admin/settings";
import { createPublicEnquiry } from "@/server/services/public/enquiries";
import { deliverPendingWhatsApp } from "@/server/whatsapp/outbox";
import { resetDatabase, seedMinimalCatalogue } from "../support/db";
import { actorFor, ctx, seedSystemRoles } from "../support/auth";

type Call = { url: string; body: { to: string; template: { name: string; components: { parameters: { text: string }[] }[] } } };
let calls: Call[] = [];

function stubMeta(response: () => Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (!url.startsWith("https://graph.facebook.com/")) throw new Error(`unexpected fetch ${url}`);
      calls.push({ url, body: JSON.parse(String(init.body)) });
      return response();
    }),
  );
}

async function submitEnquiry() {
  const input = publicEnquirySchema("2026-01-01").parse({
    eventType: "WEDDING",
    eventDate: "2027-02-14",
    eventCity: "Udaipur",
    name: "Isha\nKapoor", // newline must not break the template
    email: "isha@example.invalid",
    phoneCountryCode: "+91",
    phone: "9876500033",
    consent: true,
    formToken: "unused",
    source: "BOOKING_FORM",
  });
  return createPublicEnquiry(input, ctx);
}

describe("WhatsApp enquiry alerts", () => {
  beforeEach(async () => {
    calls = [];
    await resetDatabase();
    await seedMinimalCatalogue();
    await seedSystemRoles();
  });
  afterEach(() => vi.unstubAllGlobals());
  afterAll(() => db.$disconnect());

  it("queues one alert per configured number and delivers the approved template", async () => {
    const admin = await actorFor("ADMIN");
    await updateAlertSettings(admin, alertSettingsSchema.parse({ emails: "ops@example.invalid", whatsapp: "98765 43210\n+971 50 123 4567\n9876543210" }));
    expect((await getAlertSettings(admin)).whatsapp).toEqual(["+919876543210", "+971501234567"]);

    const { reference } = await submitEnquiry();
    expect(await db.whatsAppMessage.count({ where: { status: "PENDING" } })).toBe(2);

    stubMeta(() => Response.json({ messages: [{ id: "wamid.1" }] }));
    expect(await deliverPendingWhatsApp()).toEqual({ sent: 2, failed: 0, skipped: 0 });
    expect(calls[0]!.url).toBe("https://graph.facebook.com/v23.0/123456789/messages");
    expect(calls.map((c) => c.body.to).sort()).toEqual(["919876543210", "971501234567"]);
    const params = calls[0]!.body.template.components[0]!.parameters.map((p) => p.text);
    expect(calls[0]!.body.template.name).toBe("new_enquiry");
    expect(params.slice(0, 5)).toEqual([reference, "Isha Kapoor", "Wedding", "14 Feb 2027", "Udaipur"]);
    expect(params[5]).toMatch(/\/admin\/enquiries\/[0-9a-f-]{36}$/);
    // Never the customer's contact details.
    expect(JSON.stringify(calls)).not.toContain("9876500033");
    expect(JSON.stringify(calls)).not.toContain("isha@example.invalid");
    expect(await db.whatsAppMessage.count({ where: { status: "SENT", providerMessageId: "wamid.1" } })).toBe(2);
  });

  it("retries provider outages and gives up on permanent errors", async () => {
    const admin = await actorFor("ADMIN");
    await updateAlertSettings(admin, alertSettingsSchema.parse({ emails: "", whatsapp: "9876543210" }));
    await submitEnquiry();

    stubMeta(() => Response.json({ error: { message: "Service unavailable", code: 2 } }, { status: 503 }));
    expect((await deliverPendingWhatsApp()).failed).toBe(1);
    let row = await db.whatsAppMessage.findFirstOrThrow();
    expect(row).toMatchObject({ status: "FAILED", attempts: 1 });
    expect(row.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());

    await db.whatsAppMessage.update({ where: { id: row.id }, data: { nextAttemptAt: new Date(0) } });
    stubMeta(() => Response.json({ error: { message: "Template name does not exist", code: 132001 } }, { status: 400 }));
    await deliverPendingWhatsApp();
    row = await db.whatsAppMessage.findFirstOrThrow();
    expect(row).toMatchObject({ status: "FAILED", attempts: 6 });
    expect(row.lastError).toContain("132001");
  });

  it("rejects invalid recipients and audits changes with masked values", async () => {
    const admin = await actorFor("ADMIN");
    expect(alertSettingsSchema.safeParse({ emails: "not-an-email", whatsapp: "" }).success).toBe(false);
    expect(alertSettingsSchema.safeParse({ emails: "", whatsapp: "12345" }).success).toBe(false);
    await updateAlertSettings(admin, alertSettingsSchema.parse({ emails: "Ops@Example.invalid", whatsapp: "9876543210" }));
    const entry = await db.auditLog.findFirstOrThrow({ where: { action: "settings.alerts_updated" } });
    expect(entry.after).toEqual({ emails: ["o***@example.invalid"], whatsapp: ["+91******3210"] });
  });

  it("sends a test alert to the saved recipients; managers can't change alerts", async () => {
    const admin = await actorFor("ADMIN");
    const manager = await actorFor("MANAGER");
    await updateAlertSettings(admin, alertSettingsSchema.parse({ emails: "ops@example.invalid", whatsapp: "9876543210" }));
    stubMeta(() => Response.json({ messages: [{ id: "wamid.test" }] }));
    const report = await sendTestAlert(admin);
    expect(report.recipients).toBe(2);
    expect(report.whatsapp.sent).toBe(1);
    expect(report.email.skipped).toBe(1); // Resend isn't configured in tests: recorded as skipped, never "sent"
    await expect(getAlertSettings(manager)).rejects.toThrow("settings:write");
  });
});
