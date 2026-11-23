import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { publicEnquirySchema } from "@/lib/validation/enquiry";
import { enquiryListParamsSchema } from "@/lib/validation/admin-enquiry";
import { AuthorizationError } from "@/server/auth/actor";
import { db } from "@/server/db";
import {
  addEnquiryNote,
  assignEnquiryOwner,
  changeEnquiryStatus,
  getEnquiry,
  getEnquiryBoard,
  listEnquiries,
  logEnquiryContact,
  setEnquiryFollowUp,
} from "@/server/services/admin/enquiries";
import { getEnquiryOverview } from "@/server/services/admin/dashboard";
import { createPublicEnquiry } from "@/server/services/public/enquiries";
import { resetDatabase, seedMinimalCatalogue } from "../support/db";
import { actorFor, createTestUser, ctx, seedSystemRoles } from "../support/auth";

async function newEnquiry(name = "Test Customer", phone = "9876543210") {
  const input = publicEnquirySchema("2026-01-01").parse({
    eventType: "WEDDING",
    eventDate: "2027-02-14",
    eventCity: "Udaipur",
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.invalid`,
    phoneCountryCode: "+91",
    phone,
    consent: true,
    formToken: "unused",
    source: "BOOKING_FORM",
    budget: "1l-3l",
  });
  const { reference } = await createPublicEnquiry(input, ctx);
  return db.enquiry.findUniqueOrThrow({ where: { reference } });
}

const params = (raw: Record<string, string> = {}) => enquiryListParamsSchema.parse(raw);

describe("admin enquiry CRM", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedMinimalCatalogue();
    await seedSystemRoles();
  });
  afterAll(() => db.$disconnect());

  it("lets every enquiry:read holder see all enquiries, with search and filters", async () => {
    const staff = await actorFor("STAFF");
    const finance = await actorFor("FINANCE");
    const a = await newEnquiry("Priya Sharma", "9876500001");
    await newEnquiry("Rahul Verma", "9876500002");
    await assignEnquiryOwner(staff, { enquiryId: a.id, ownerId: staff.userId });

    expect((await listEnquiries(finance, params())).total).toBe(2);
    expect((await listEnquiries(staff, params({ q: "priya" }))).items.map((e) => e.contactName)).toEqual(["Priya Sharma"]);
    expect((await listEnquiries(staff, params({ q: a.reference }))).total).toBe(1);
    expect((await listEnquiries(staff, params({ q: "00002" }))).items[0]?.contactName).toBe("Rahul Verma");
    expect((await listEnquiries(staff, params({ owner: "me" }))).total).toBe(1);
    expect((await listEnquiries(finance, params({ owner: "me" }))).total).toBe(0);
    expect((await listEnquiries(staff, params({ owner: "unassigned" }))).total).toBe(1);

    const board = await getEnquiryBoard(staff, params());
    expect(board.find((c) => c.status === "NEW")?.total).toBe(2);
  });

  it("hides closed enquiries unless asked", async () => {
    const staff = await actorFor("STAFF");
    const e = await newEnquiry();
    await changeEnquiryStatus(staff, { enquiryId: e.id, from: "NEW", to: "LOST", lostReason: "BUDGET" });
    expect((await listEnquiries(staff, params())).total).toBe(0);
    expect((await listEnquiries(staff, params({ closed: "1" }))).total).toBe(1);
  });

  it("requires enquiry:write for changes (finance is read-only)", async () => {
    const finance = await actorFor("FINANCE");
    const e = await newEnquiry();
    await expect(changeEnquiryStatus(finance, { enquiryId: e.id, from: "NEW", to: "CONTACTED" })).rejects.toBeInstanceOf(AuthorizationError);
    await expect(addEnquiryNote(finance, { enquiryId: e.id, body: "x" })).rejects.toBeInstanceOf(AuthorizationError);
    expect((await getEnquiry(finance, e.id))?.permissions).toEqual({ write: false, reopen: false, delete: false });
  });

  it("enforces the pipeline: valid transitions, lost reason, no manual CONFIRMED, stale-status conflicts", async () => {
    const staff = await actorFor("STAFF");
    const e = await newEnquiry();

    await expect(changeEnquiryStatus(staff, { enquiryId: e.id, from: "NEW", to: "CONFIRMED" })).rejects.toMatchObject({
      code: "invalid_transition",
    });
    await expect(changeEnquiryStatus(staff, { enquiryId: e.id, from: "NEW", to: "NEGOTIATION" })).rejects.toMatchObject({
      code: "invalid_transition",
    });
    await expect(changeEnquiryStatus(staff, { enquiryId: e.id, from: "NEW", to: "LOST" })).rejects.toMatchObject({
      code: "lost_reason_required",
    });

    await changeEnquiryStatus(staff, { enquiryId: e.id, from: "NEW", to: "QUALIFIED" });
    // A second user acting on the stale "NEW" view is refused rather than overwriting.
    await expect(changeEnquiryStatus(staff, { enquiryId: e.id, from: "NEW", to: "CONTACTED" })).rejects.toMatchObject({ code: "conflict" });

    await changeEnquiryStatus(staff, { enquiryId: e.id, from: "QUALIFIED", to: "LOST", lostReason: "CHOSE_COMPETITOR", lostReasonNote: "Went local" });
    const lost = await db.enquiry.findUniqueOrThrow({ where: { id: e.id } });
    expect(lost.status).toBe("LOST");
    expect(lost.lostReason).toBe("CHOSE_COMPETITOR");
    expect(lost.closedAt).not.toBeNull();

    const timeline = await db.enquiryActivity.findMany({ where: { enquiryId: e.id, type: "STATUS_CHANGED" }, orderBy: { occurredAt: "asc" } });
    expect(timeline.map((a) => a.toStatus)).toEqual(["QUALIFIED", "LOST"]);
  });

  it("needs enquiry:reopen to re-open a closed enquiry", async () => {
    const staff = await actorFor("STAFF");
    const manager = await actorFor("MANAGER");
    const e = await newEnquiry();
    await changeEnquiryStatus(staff, { enquiryId: e.id, from: "NEW", to: "CANCELLED" });
    await expect(changeEnquiryStatus(staff, { enquiryId: e.id, from: "CANCELLED", to: "CONTACTED" })).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    await changeEnquiryStatus(manager, { enquiryId: e.id, from: "CANCELLED", to: "CONTACTED" });
    const reopened = await db.enquiry.findUniqueOrThrow({ where: { id: e.id } });
    expect(reopened.status).toBe("CONTACTED");
    expect(reopened.closedAt).toBeNull();
  });

  it("assigns owners who can work enquiries and notifies them", async () => {
    const manager = await actorFor("MANAGER");
    const staff = await createTestUser("STAFF", { name: "Ravi" });
    const finance = await createTestUser("FINANCE");
    const e = await newEnquiry();

    await expect(assignEnquiryOwner(manager, { enquiryId: e.id, ownerId: finance.id })).rejects.toMatchObject({ code: "invalid_owner" });
    await assignEnquiryOwner(manager, { enquiryId: e.id, ownerId: staff.id });
    expect((await db.enquiry.findUniqueOrThrow({ where: { id: e.id } })).ownerId).toBe(staff.id);
    const note = await db.notification.findFirstOrThrow({ where: { recipientId: staff.id, type: "enquiry.assigned" } });
    expect(note.href).toBe(`/admin/enquiries/${e.id}`);
  });

  it("logging the first conversation moves NEW to CONTACTED; follow-ups surface on the dashboard", async () => {
    const staff = await actorFor("STAFF");
    const e = await newEnquiry();
    const { movedToContacted } = await logEnquiryContact(staff, { enquiryId: e.id, type: "CALL", summary: "Discussed dates" });
    expect(movedToContacted).toBe(true);
    const again = await logEnquiryContact(staff, { enquiryId: e.id, type: "WHATSAPP", summary: "Sent artist options" });
    expect(again.movedToContacted).toBe(false);

    const updated = await db.enquiry.findUniqueOrThrow({ where: { id: e.id } });
    expect(updated.status).toBe("CONTACTED");
    expect(updated.lastContactedAt).not.toBeNull();

    await setEnquiryFollowUp(staff, { enquiryId: e.id, at: "2020-01-01T10:00" }); // overdue
    const overview = await getEnquiryOverview(staff);
    expect(overview.followUpsDue).toBe(1);
    expect(overview.open).toBe(1);
    expect((await listEnquiries(staff, params({ followUp: "due" }))).items[0]?.followUpDue).toBe(true);
    // Stored as 10:00 IST = 04:30 UTC.
    expect((await db.enquiry.findUniqueOrThrow({ where: { id: e.id } })).nextFollowUpAt?.toISOString()).toBe("2020-01-01T04:30:00.000Z");
  });
});
