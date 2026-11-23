import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { artistInternalSchema, artistListParamsSchema, createArtistSchema, updateArtistSchema } from "@/lib/validation/artists";
import { AuthorizationError } from "@/server/auth/actor";
import { db } from "@/server/db";
import {
  createArtist,
  deleteArtist,
  getArtistForAdmin,
  listArtists,
  markArtistAvailabilityVerified,
  setArtistStatus,
  updateArtist,
  updateArtistInternal,
} from "@/server/services/admin/artists";
import { resetDatabase, seedMinimalCatalogue } from "../support/db";
import { actorFor, seedSystemRoles } from "../support/auth";

let categoryId: string;

const profile = (overrides: Record<string, unknown> = {}) => ({
  stageName: "Rhea & The Strings",
  categoryId,
  shortBio: "A fictional string quartet for weddings and soirées.",
  biography: "A fictional string quartet that plays classical and Bollywood arrangements for weddings and soirées.",
  baseCity: "Pune",
  languages: "Hindi, English, hindi",
  performanceTypes: "Acoustic",
  eventTypes: ["WEDDING", "CORPORATE"],
  publicPriceFrom: "",
  ...overrides,
});

const params = (raw: Record<string, string> = {}) => artistListParamsSchema.parse(raw);

describe("admin artists", () => {
  beforeEach(async () => {
    await resetDatabase();
    ({ category: { id: categoryId } } = await seedMinimalCatalogue());
    await seedSystemRoles();
  });
  afterAll(() => db.$disconnect());

  it("creates an artist with a unique slug, unpublished by default", async () => {
    const manager = await actorFor("MANAGER");
    const a = await createArtist(manager, createArtistSchema.parse(profile()));
    const b = await createArtist(manager, createArtistSchema.parse(profile()));
    expect(a.slug).toBe("rhea-and-the-strings");
    expect(b.slug).toBe("rhea-and-the-strings-2");
    const row = await db.artist.findUniqueOrThrow({ where: { id: a.id }, include: { internal: true } });
    expect(row.status).toBe("INACTIVE");
    expect(row.languages).toEqual(["Hindi", "English"]);
    expect(row.internal).not.toBeNull();
    expect(await db.auditLog.count({ where: { action: "artist.created", entityId: a.id } })).toBe(1);
  });

  it("refuses an explicit slug that is taken", async () => {
    const manager = await actorFor("MANAGER");
    await expect(createArtist(manager, createArtistSchema.parse(profile({ slug: "test-artist" })))).rejects.toMatchObject({ code: "slug_taken" });
  });

  it("requires artist:write; staff and finance are read-only", async () => {
    const staff = await actorFor("STAFF");
    await expect(createArtist(staff, createArtistSchema.parse(profile()))).rejects.toBeInstanceOf(AuthorizationError);
    expect((await listArtists(staff, params())).total).toBe(1);
  });

  it("refuses a stale save instead of overwriting someone else's edit", async () => {
    const manager = await actorFor("MANAGER");
    const { id } = await createArtist(manager, createArtistSchema.parse(profile()));
    const loaded = await getArtistForAdmin(manager, id);
    const expectedUpdatedAt = loaded!.updatedAt.toISOString();
    await updateArtist(manager, updateArtistSchema.parse({ ...profile({ tagline: "First" }), artistId: id, expectedUpdatedAt }));
    await expect(
      updateArtist(manager, updateArtistSchema.parse({ ...profile({ tagline: "Second" }), artistId: id, expectedUpdatedAt })),
    ).rejects.toMatchObject({ code: "conflict" });
    expect((await db.artist.findUniqueOrThrow({ where: { id } })).tagline).toBe("First");
  });

  it("reports old and new slugs when renamed, so both cache tags expire", async () => {
    const manager = await actorFor("MANAGER");
    const { id } = await createArtist(manager, createArtistSchema.parse(profile()));
    const loaded = await getArtistForAdmin(manager, id);
    const result = await updateArtist(
      manager,
      updateArtistSchema.parse({ ...profile({ slug: "rhea-strings" }), artistId: id, expectedUpdatedAt: loaded!.updatedAt.toISOString() }),
    );
    expect(result.slugs.sort()).toEqual(["rhea-and-the-strings", "rhea-strings"]);
  });

  it("hides confidential data without artist:internal and audits changes to it", async () => {
    const manager = await actorFor("MANAGER");
    const staff = await actorFor("STAFF");
    const { id } = await createArtist(manager, createArtistSchema.parse(profile()));
    await updateArtistInternal(
      manager,
      artistInternalSchema.parse({ artistId: id, basePrice: "1,50,000", commissionType: "PERCENTAGE", commissionRate: "17.5", internalNotes: "Secret" }),
    );
    const forStaff = await getArtistForAdmin(staff, id);
    expect(forStaff?.internal).toBeNull();
    expect(JSON.stringify(forStaff)).not.toContain("Secret");
    const forManager = await getArtistForAdmin(manager, id);
    expect(forManager?.internal).toMatchObject({ basePricePaise: "15000000", commissionRateBps: 1750, internalNotes: "Secret" });
    await expect(
      updateArtistInternal(staff, artistInternalSchema.parse({ artistId: id, commissionType: "FIXED", commissionFixed: "5000" })),
    ).rejects.toBeInstanceOf(AuthorizationError);

    const entry = await db.auditLog.findFirstOrThrow({ where: { action: "artist.internal_updated", entityId: id } });
    expect(entry.after).toMatchObject({ basePricePaise: "15000000", commissionRateBps: 1750, changedFields: ["internalNotes"] });
    expect(JSON.stringify(entry)).not.toContain("Secret");
  });

  it("publishes and unpublishes through status, with optimistic concurrency", async () => {
    const manager = await actorFor("MANAGER");
    const { id, slug } = await createArtist(manager, createArtistSchema.parse(profile()));
    // Public reads filter on ACTIVE (they're `"use cache"` functions, so not callable here).
    const isPublic = async () => (await db.artist.count({ where: { slug, status: "ACTIVE" } })) === 1;
    expect(await isPublic()).toBe(false);
    expect(await setArtistStatus(manager, { artistId: id, from: "INACTIVE", to: "ACTIVE" })).toEqual({ slugs: [slug] });
    expect(await isPublic()).toBe(true);
    await expect(setArtistStatus(manager, { artistId: id, from: "INACTIVE", to: "ON_HOLD" })).rejects.toMatchObject({ code: "conflict" });

    await db.artist.update({ where: { id }, data: { isFeatured: true } });
    await setArtistStatus(manager, { artistId: id, from: "ACTIVE", to: "ARCHIVED" });
    const archived = await db.artist.findUniqueOrThrow({ where: { id } });
    expect(archived.archivedAt).not.toBeNull();
    expect(archived.isFeatured).toBe(false);
    expect((await listArtists(manager, params())).items.map((a) => a.id)).not.toContain(id);
    expect((await listArtists(manager, params({ archived: "1" }))).items.map((a) => a.id)).toContain(id);
  });

  it("marks availability verified", async () => {
    const manager = await actorFor("MANAGER");
    const { id } = await createArtist(manager, createArtistSchema.parse(profile({ status: "ACTIVE" })));
    const now = new Date("2026-11-20T10:00:00Z");
    await markArtistAvailabilityVerified(manager, { artistId: id }, now);
    expect((await db.artist.findUniqueOrThrow({ where: { id } })).availabilityVerifiedAt).toEqual(now);
  });

  it("permanently deletes an artist without history, with its own data", async () => {
    const admin = await actorFor("ADMIN");
    const { id, slug } = await createArtist(admin, createArtistSchema.parse(profile()));
    await updateArtistInternal(admin, artistInternalSchema.parse({ artistId: id, commissionType: "PERCENTAGE", commissionRate: "20" }));
    await db.artistMedia.create({ data: { artistId: id, type: "IMAGE", url: "https://res.cloudinary.com/demo/x.jpg" } });

    expect((await getArtistForAdmin(admin, id))?.deleteBlockers).toEqual([]);
    await expect(deleteArtist(admin, { artistId: id, confirmName: "wrong" })).rejects.toMatchObject({ code: "validation_error" });
    expect(await deleteArtist(admin, { artistId: id, confirmName: "rhea & the strings" })).toEqual({ slugs: [slug] });

    expect(await db.artist.count({ where: { id } })).toBe(0);
    expect(await db.artistInternal.count({ where: { artistId: id } })).toBe(0);
    expect(await db.artistMedia.count({ where: { artistId: id } })).toBe(0);
    const entry = await db.auditLog.findFirstOrThrow({ where: { action: "artist.deleted", entityId: id } });
    expect(entry.before).toMatchObject({ slug, stageName: "Rhea & The Strings" });
  });

  it("refuses to delete an artist with history, and managers can't delete at all", async () => {
    const admin = await actorFor("ADMIN");
    const manager = await actorFor("MANAGER");
    const artist = await db.artist.findUniqueOrThrow({ where: { slug: "test-artist" } });
    const enquiry = await db.enquiry.create({
      data: {
        reference: "ENQ-2099-000001",
        source: "BOOKING_FORM",
        contactName: "Fictional Person",
        contactEmail: "person@example.invalid",
        contactPhone: "+919876543210",
        eventType: "WEDDING",
        eventDate: new Date("2027-02-14"),
        eventCity: "Goa",
        artists: { create: { artistId: artist.id } },
      },
    });
    expect((await getArtistForAdmin(admin, artist.id))?.deleteBlockers).toEqual(["1 enquiry"]);
    await expect(deleteArtist(admin, { artistId: artist.id, confirmName: "Test Artist" })).rejects.toMatchObject({ code: "has_history" });
    await expect(deleteArtist(manager, { artistId: artist.id, confirmName: "Test Artist" })).rejects.toBeInstanceOf(AuthorizationError);
    expect((await getArtistForAdmin(manager, artist.id))?.permissions.delete).toBe(false);
    expect(await db.artist.count({ where: { id: artist.id } })).toBe(1);
    expect(enquiry.id).toBeTruthy();
  });
});
