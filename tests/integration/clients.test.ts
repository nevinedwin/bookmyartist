import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { publicEnquirySchema } from "@/lib/validation/enquiry";
import { clientListParamsSchema, createClientSchema, updateClientSchema } from "@/lib/validation/clients";
import { AuthorizationError } from "@/server/auth/actor";
import { db } from "@/server/db";
import {
  createClient,
  createClientFromEnquiry,
  getClient,
  getEnquiryClientSuggestions,
  linkEnquiryClient,
  listClients,
  searchClients,
  setClientArchived,
  updateClient,
} from "@/server/services/admin/clients";
import { createPublicEnquiry } from "@/server/services/public/enquiries";
import { resetDatabase, seedMinimalCatalogue } from "../support/db";
import { actorFor, ctx, seedSystemRoles } from "../support/auth";

const params = (raw: Record<string, string> = {}) => clientListParamsSchema.parse(raw);

async function newEnquiry(email = "meera.iyer@example.invalid", phone = "9876501234") {
  const input = publicEnquirySchema("2026-01-01").parse({
    eventType: "CORPORATE",
    eventDate: "2027-03-10",
    eventCity: "Bengaluru",
    name: "Meera Iyer",
    email,
    phoneCountryCode: "+91",
    phone,
    organization: "Fictional Labs",
    consent: true,
    formToken: "unused",
    source: "CONTACT_PAGE",
  });
  const { reference } = await createPublicEnquiry(input, ctx);
  return db.enquiry.findUniqueOrThrow({ where: { reference } });
}

async function created(result: Awaited<ReturnType<typeof createClient>>) {
  if (!result.created) throw new Error("expected a new client");
  return result.id;
}

describe("admin clients", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedMinimalCatalogue();
    await seedSystemRoles();
  });
  afterAll(() => db.$disconnect());

  it("normalises contact details and finds clients by name, email and phone", async () => {
    const staff = await actorFor("STAFF");
    await created(await createClient(staff, createClientSchema.parse({ name: "Arjun Mehta", email: "Arjun@Example.invalid", phone: "98765 43210" })));
    const row = await db.client.findFirstOrThrow();
    expect(row).toMatchObject({ email: "arjun@example.invalid", phone: "+919876543210", createdById: staff.userId });
    expect((await listClients(staff, params({ q: "arjun" }))).total).toBe(1);
    expect((await listClients(staff, params({ q: "43210" }))).total).toBe(1);
    expect(await searchClients(staff, "mehta")).toHaveLength(1);
  });

  it("requires an email or phone", () => {
    expect(createClientSchema.safeParse({ name: "No Contact" }).success).toBe(false);
  });

  it("returns possible duplicates instead of creating, unless confirmed", async () => {
    const staff = await actorFor("STAFF");
    const first = await created(await createClient(staff, createClientSchema.parse({ name: "Arjun Mehta", phone: "9876543210" })));
    const dup = await createClient(staff, createClientSchema.parse({ name: "A. Mehta", phone: "+91 98765 43210" }));
    expect(dup).toEqual({ created: false, duplicates: [expect.objectContaining({ id: first, matchedOn: ["phone"] })] });
    const forced = await createClient(staff, createClientSchema.parse({ name: "A. Mehta", phone: "9876543210", allowDuplicate: true }));
    expect(forced.created).toBe(true);
    expect((await getClient(staff, first))?.possibleDuplicates).toHaveLength(1);
  });

  it("finance can read but not write clients", async () => {
    const finance = await actorFor("FINANCE");
    await expect(createClient(finance, createClientSchema.parse({ name: "X Y", email: "x@example.invalid" }))).rejects.toBeInstanceOf(AuthorizationError);
    expect((await listClients(finance, params())).total).toBe(0);
  });

  it("refuses stale edits and archives without losing history", async () => {
    const staff = await actorFor("STAFF");
    const id = await created(await createClient(staff, createClientSchema.parse({ name: "Arjun Mehta", email: "arjun@example.invalid" })));
    const loaded = await getClient(staff, id);
    const base = { clientId: id, expectedUpdatedAt: loaded!.updatedAt.toISOString(), email: "arjun@example.invalid" };
    await updateClient(staff, updateClientSchema.parse({ ...base, name: "Arjun M." }));
    await expect(updateClient(staff, updateClientSchema.parse({ ...base, name: "Stale" }))).rejects.toMatchObject({ code: "conflict" });

    await setClientArchived(staff, { clientId: id, archived: true });
    expect((await listClients(staff, params())).total).toBe(0);
    expect((await listClients(staff, params({ archived: "1" }))).total).toBe(1);
    expect(await searchClients(staff, "arjun")).toHaveLength(0);
  });

  it("suggests, links and creates clients from enquiries, logging the timeline", async () => {
    const staff = await actorFor("STAFF");
    const enquiry = await newEnquiry();
    const existing = await created(await createClient(staff, createClientSchema.parse({ name: "Meera Iyer", email: "meera.iyer@example.invalid" })));

    expect((await getEnquiryClientSuggestions(staff, enquiry.id)).map((m) => m.id)).toEqual([existing]);
    await linkEnquiryClient(staff, { enquiryId: enquiry.id, clientId: existing });
    expect((await db.enquiry.findUniqueOrThrow({ where: { id: enquiry.id } })).clientId).toBe(existing);
    expect(await getEnquiryClientSuggestions(staff, enquiry.id)).toEqual([]);
    expect((await getClient(staff, existing))?.enquiries.map((e) => e.id)).toEqual([enquiry.id]);

    await linkEnquiryClient(staff, { enquiryId: enquiry.id, clientId: null });
    const { clientId } = await createClientFromEnquiry(staff, { enquiryId: enquiry.id });
    const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
    expect(client).toMatchObject({ name: "Meera Iyer", phone: "+919876501234", organization: "Fictional Labs", type: "CORPORATE" });
    await expect(createClientFromEnquiry(staff, { enquiryId: enquiry.id })).rejects.toMatchObject({ code: "conflict" });

    const summaries = (await db.enquiryActivity.findMany({ where: { enquiryId: enquiry.id }, orderBy: { occurredAt: "asc" } })).map((a) => a.summary);
    expect(summaries).toEqual(expect.arrayContaining(["Linked to client Meera Iyer", "Client unlinked", "Created client Meera Iyer from this enquiry"]));
    // The submitted snapshot is untouched.
    expect((await db.enquiry.findUniqueOrThrow({ where: { id: enquiry.id } })).contactEmail).toBe("meera.iyer@example.invalid");
  });

  it("hides linked enquiries from people without enquiry:read", async () => {
    const staff = await actorFor("STAFF");
    const enquiry = await newEnquiry();
    const { clientId } = await createClientFromEnquiry(staff, { enquiryId: enquiry.id });
    // Same actor shape the session layer builds, with only client:read.
    const limited = { ...staff, permissions: new Set(["client:read"] as const) };
    expect((await getClient(limited, clientId))?.enquiries).toEqual([]);
  });
});
