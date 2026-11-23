import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { publicEnquirySchema } from "@/lib/validation/enquiry";
import { deleteEnquirySchema, updateEnquirySchema } from "@/lib/validation/admin-enquiry";
import { createTaskSchema } from "@/lib/validation/tasks";
import { AuthorizationError } from "@/server/auth/actor";
import { db } from "@/server/db";
import { addEnquiryNote, deleteEnquiry, getEnquiry, updateEnquiryDetails } from "@/server/services/admin/enquiries";
import { createTask } from "@/server/services/admin/tasks";
import { createPublicEnquiry } from "@/server/services/public/enquiries";
import { resetDatabase, seedMinimalCatalogue } from "../support/db";
import { actorFor, ctx, seedSystemRoles } from "../support/auth";

async function newEnquiry() {
  const input = publicEnquirySchema("2026-01-01").parse({
    eventType: "WEDDING",
    eventDate: "2027-02-14",
    eventCity: "Udaipur",
    name: "Tara Nair",
    email: "tara.nair@example.invalid",
    phoneCountryCode: "+91",
    phone: "9876500011",
    consent: true,
    formToken: "unused",
    source: "BOOKING_FORM",
    budget: "1l-3l",
    message: "Original words",
  });
  const { reference } = await createPublicEnquiry(input, ctx);
  return db.enquiry.findUniqueOrThrow({ where: { reference } });
}

function editInput(e: Awaited<ReturnType<typeof newEnquiry>>, overrides: Record<string, unknown> = {}) {
  return updateEnquirySchema.parse({
    enquiryId: e.id,
    expectedUpdatedAt: e.updatedAt.toISOString(),
    contactName: e.contactName,
    contactEmail: e.contactEmail,
    contactPhone: e.contactPhone,
    eventType: e.eventType,
    eventDate: e.eventDate.toISOString().slice(0, 10),
    eventCity: e.eventCity,
    budgetMin: "1,00,000",
    budgetMax: "3,00,000",
    ...overrides,
  });
}

describe("editing and deleting enquiries", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedMinimalCatalogue();
    await seedSystemRoles();
  });
  afterAll(() => db.$disconnect());

  it("saves corrections and summarises them on the timeline", async () => {
    const staff = await actorFor("STAFF");
    const e = await newEnquiry();
    expect((await updateEnquiryDetails(staff, editInput(e))).changed).toEqual([]);

    const { changed } = await updateEnquiryDetails(
      staff,
      editInput(e, { eventDate: "2027-02-21", eventCity: "Jaipur", contactPhone: "98765 00022", budgetMax: "5,00,000" }),
    );
    expect(changed).toEqual(["contactPhone", "eventDate", "eventCity", "budget"]);
    const row = await db.enquiry.findUniqueOrThrow({ where: { id: e.id } });
    expect(row).toMatchObject({ eventCity: "Jaipur", contactPhone: "+919876500022", budgetMaxPaise: 50_000_000n, message: "Original words" });
    const entry = await db.enquiryActivity.findFirstOrThrow({ where: { enquiryId: e.id, summary: { startsWith: "Details edited" } } });
    expect(entry.summary).toBe("Details edited: phone; event date 14 Feb 2027 → 21 Feb 2027; city Udaipur → Jaipur; budget ₹1L – ₹3L → ₹1L – ₹5L");
    expect(entry.summary).not.toContain("9876500022");
  });

  it("refuses a stale edit and validates the budget order", async () => {
    const staff = await actorFor("STAFF");
    const e = await newEnquiry();
    await updateEnquiryDetails(staff, editInput(e, { eventCity: "Jaipur" }));
    await expect(updateEnquiryDetails(staff, editInput(e, { eventCity: "Goa" }))).rejects.toMatchObject({ code: "conflict" });
    expect(updateEnquirySchema.safeParse({ ...editInput(e), budgetMin: "5,00,000", budgetMax: "1,00,000" }).success).toBe(false);
  });

  it("finance can't edit; only admins can delete", async () => {
    const finance = await actorFor("FINANCE");
    const manager = await actorFor("MANAGER");
    const e = await newEnquiry();
    await expect(updateEnquiryDetails(finance, editInput(e))).rejects.toBeInstanceOf(AuthorizationError);
    await expect(deleteEnquiry(manager, { enquiryId: e.id, confirmReference: e.reference })).rejects.toBeInstanceOf(AuthorizationError);
    expect((await getEnquiry(manager, e.id))?.permissions.delete).toBe(false);
  });

  it("deletes an enquiry with its notes, tasks and notifications, and audits it", async () => {
    const admin = await actorFor("ADMIN");
    const staff = await actorFor("STAFF");
    const e = await newEnquiry();
    await addEnquiryNote(admin, { enquiryId: e.id, body: "Looks like spam" });
    await createTask(admin, createTaskSchema.parse({ title: "Check", enquiryId: e.id, assigneeId: staff.userId }));
    expect((await getEnquiry(admin, e.id))?.deleteImpact).toEqual({ tasks: 1, notes: 1 });

    await expect(deleteEnquiry(admin, deleteEnquirySchema.parse({ enquiryId: e.id, confirmReference: "ENQ-WRONG" }))).rejects.toMatchObject({
      code: "validation_error",
    });
    await deleteEnquiry(admin, deleteEnquirySchema.parse({ enquiryId: e.id, confirmReference: e.reference.toLowerCase() }));

    expect(await db.enquiry.count({ where: { id: e.id } })).toBe(0);
    expect(await db.enquiryNote.count()).toBe(0);
    expect(await db.enquiryActivity.count({ where: { enquiryId: e.id } })).toBe(0);
    expect(await db.task.count()).toBe(0);
    expect(await db.notification.count({ where: { href: `/admin/enquiries/${e.id}` } })).toBe(0);
    const entry = await db.auditLog.findFirstOrThrow({ where: { action: "enquiry.deleted", entityId: e.id } });
    expect(entry.before).toMatchObject({ reference: e.reference, contactEmail: "t***@example.invalid", tasksDeleted: 1 });
    expect(JSON.stringify(entry)).not.toContain("tara.nair");
  });

  it("refuses to delete an enquiry that has a quotation", async () => {
    const admin = await actorFor("ADMIN");
    const e = await newEnquiry();
    const blockers = async () => (await getEnquiry(admin, e.id))?.deleteBlockers;
    expect(await blockers()).toEqual([]);
    const client = await db.client.create({ data: { name: "Tara Nair", email: "tara.nair@example.invalid" } });
    await db.quotation.create({ data: { number: "QT-2099-000001", enquiryId: e.id, clientId: client.id } });
    expect(await blockers()).toEqual(["1 quotation"]);
    await expect(deleteEnquiry(admin, { enquiryId: e.id, confirmReference: e.reference })).rejects.toMatchObject({ code: "has_history" });
  });
});
