import { describe, expect, it } from "vitest";
import { publicEnquirySchema, toE164 } from "@/lib/validation/enquiry";

const today = "2026-11-23";
const valid = {
  eventType: "WEDDING",
  eventDate: "2027-02-14",
  eventCity: "Udaipur",
  name: "Test Customer",
  email: "  Test.Customer@Example.com ",
  phoneCountryCode: "+91",
  phone: "98765 43210",
  consent: true,
  formToken: "x",
  source: "BOOKING_FORM",
};

const parse = (overrides: Record<string, unknown> = {}) => publicEnquirySchema(today).safeParse({ ...valid, ...overrides });
const fieldError = (overrides: Record<string, unknown>, field: string) => {
  const r = parse(overrides);
  return r.success ? undefined : r.error.issues.find((i) => i.path[0] === field)?.message;
};

describe("public enquiry schema", () => {
  it("accepts a minimal valid enquiry and normalises fields", () => {
    const r = parse();
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.email).toBe("test.customer@example.com");
    expect(r.data.phone).toBe("9876543210");
    expect(r.data.venue).toBeUndefined();
  });

  it("rejects past dates, but accepts today", () => {
    expect(fieldError({ eventDate: "2026-11-22" }, "eventDate")).toMatch(/past/);
    expect(parse({ eventDate: today }).success).toBe(true);
  });

  it("rejects dates too far in the future", () => {
    expect(fieldError({ eventDate: "2035-01-01" }, "eventDate")).toBeDefined();
  });

  it("validates Indian mobile numbers", () => {
    expect(fieldError({ phone: "12345" }, "phone")).toBeDefined();
    expect(fieldError({ phone: "5876543210" }, "phone")).toMatch(/Indian mobile/);
    expect(parse({ phoneCountryCode: "+971", phone: "501234567" }).success).toBe(true);
  });

  it("requires consent", () => {
    expect(fieldError({ consent: false }, "consent")).toBeDefined();
  });

  it("rejects a filled honeypot", () => {
    expect(fieldError({ website: "http://spam.example" }, "website")).toBeDefined();
  });

  it("rejects unknown event types, sources and malformed slugs", () => {
    expect(fieldError({ eventType: "RAVE" }, "eventType")).toBeDefined();
    expect(fieldError({ source: "ADMIN_MANUAL" }, "source")).toBeDefined();
    expect(fieldError({ artistSlug: "../../etc" }, "artistSlug")).toBeDefined();
  });

  it("coerces optional numeric fields and enforces ranges", () => {
    const r = parse({ audienceSize: "500", performersCount: "" });
    expect(r.success && r.data.audienceSize).toBe(500);
    expect(fieldError({ durationMinutes: "5" }, "durationMinutes")).toBeDefined();
  });

  it("caps long free text", () => {
    expect(fieldError({ message: "x".repeat(2001) }, "message")).toBeDefined();
  });

  it("builds E.164 numbers", () => {
    expect(toE164("+91", "09876543210")).toBe("+919876543210");
  });
});
