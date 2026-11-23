import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ArtistStatus, CommissionType, EnquiryStatus, EventType } from "@/generated/prisma/enums";
import { ARTIST_STATUS_LABELS } from "@/lib/labels";
import { nextAvailableSlug, slugify } from "@/lib/slug";
import {
  ARTIST_PAGE_SIZE,
  type ArtistInternalInput,
  type ArtistListParams,
  type ArtistProfileInput,
} from "@/lib/validation/artists";
import { type Actor, authorize, can } from "@/server/auth/actor";
import { db, type Tx } from "@/server/db";
import { CLOSED_ENQUIRY_STATUSES } from "@/server/domain/enquiry-status";
import { audit } from "../audit";
import { ServiceError, conflictError, notFoundError } from "../errors";

/*
 * Artist management. `artist:read` sees the public profile fields and status;
 * `artist:write` edits them; confidential data (`ArtistInternal`: legal name,
 * private contacts, rates, commission, bank note) needs `artist:internal` to
 * read *and* write, and every change to it is audited.
 *
 * Every write returns the slugs it affected so the Server Action can expire
 * the public catalogue cache for them (services can't call `updateTag`).
 */

/** Matches the public site: the "Available" badge shows for 30 days after a check. */
const AVAILABILITY_FRESH_MS = 30 * 86_400_000;
const isFresh = (verifiedAt: Date | null, now: Date) => !!verifiedAt && now.getTime() - verifiedAt.getTime() <= AVAILABILITY_FRESH_MS;

export interface CatalogueChange {
  slugs: string[];
}

// ───────────────────────────── Reads ─────────────────────────────

export interface ArtistListItem {
  id: string;
  slug: string;
  stageName: string;
  status: ArtistStatus;
  isFeatured: boolean;
  categoryName: string;
  baseCity: string;
  profileImageUrl: string | null;
  availabilityVerifiedAt: Date | null;
  availabilityFresh: boolean;
  openEnquiries: number;
  updatedAt: Date;
}

export interface ArtistPage {
  items: ArtistListItem[];
  total: number;
  page: number;
  pageCount: number;
}

function listWhere(params: ArtistListParams): Prisma.ArtistWhereInput {
  const and: Prisma.ArtistWhereInput[] = [];
  if (params.status) and.push({ status: params.status });
  else if (!params.archived) and.push({ status: { not: "ARCHIVED" } });
  if (params.category) and.push({ categoryId: params.category });
  if (params.featured) and.push({ isFeatured: true });
  if (params.q) {
    const q = params.q;
    and.push({
      OR: [
        { stageName: { contains: q, mode: "insensitive" } },
        { slug: { contains: q.toLowerCase() } },
        { baseCity: { contains: q, mode: "insensitive" } },
        { tagline: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

export async function listArtists(actor: Actor, params: ArtistListParams, now = new Date()): Promise<ArtistPage> {
  authorize(actor, "artist:read");
  const where = listWhere(params);
  const page = params.page ?? 1;
  const [total, rows] = await Promise.all([
    db.artist.count({ where }),
    db.artist.findMany({
      where,
      orderBy: [{ stageName: "asc" }],
      skip: (page - 1) * ARTIST_PAGE_SIZE,
      take: ARTIST_PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        stageName: true,
        status: true,
        isFeatured: true,
        baseCity: true,
        profileImageUrl: true,
        availabilityVerifiedAt: true,
        updatedAt: true,
        category: { select: { name: true } },
        _count: {
          select: { enquiryLinks: { where: { enquiry: { status: { notIn: [...CLOSED_ENQUIRY_STATUSES] } } } } },
        },
      },
    }),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      stageName: r.stageName,
      status: r.status,
      isFeatured: r.isFeatured,
      categoryName: r.category.name,
      baseCity: r.baseCity,
      profileImageUrl: r.profileImageUrl,
      availabilityVerifiedAt: r.availabilityVerifiedAt,
      availabilityFresh: isFresh(r.availabilityVerifiedAt, now),
      openEnquiries: r._count.enquiryLinks,
      updatedAt: r.updatedAt,
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ARTIST_PAGE_SIZE)),
  };
}

export interface CategoryOption {
  id: string;
  name: string;
  isActive: boolean;
}

export async function listArtistCategories(actor: Actor): Promise<CategoryOption[]> {
  authorize(actor, "artist:read");
  return db.artistCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, isActive: true },
  });
}

/** Form-shaped profile: strings for money (rupees as typed), arrays as lists. */
export interface ArtistProfileValues {
  stageName: string;
  slug: string;
  categoryId: string;
  tagline: string;
  shortBio: string;
  biography: string;
  performanceDescription: string;
  profileImageUrl: string;
  coverImageUrl: string;
  baseCity: string;
  languages: string[];
  performanceTypes: string[];
  eventTypes: EventType[];
  technicalRequirements: string;
  teamSize: string;
  minDurationMinutes: string;
  maxDurationMinutes: string;
  publicPriceVisible: boolean;
  /** Paise string, or "" — the form converts to rupees for display. */
  publicPriceFromPaise: string;
  publicPriceNote: string;
  publicContactApproved: boolean;
  publicEmail: string;
  publicPhone: string;
  isFeatured: boolean;
  featuredOrder: string;
  seoTitle: string;
  seoDescription: string;
}

export interface ArtistInternalValues {
  legalName: string;
  contactEmail: string;
  contactPhone: string;
  managerName: string;
  managerPhone: string;
  basePricePaise: string;
  commissionType: CommissionType;
  commissionRateBps: number | null;
  commissionFixedPaise: string;
  bankDetailsNote: string;
  internalNotes: string;
  updatedAt: Date | null;
}

export interface ArtistDetail {
  id: string;
  status: ArtistStatus;
  archivedAt: Date | null;
  availabilityVerifiedAt: Date | null;
  availabilityFresh: boolean;
  createdAt: Date;
  updatedAt: Date;
  profile: ArtistProfileValues;
  /** Present only for holders of `artist:internal`. */
  internal: ArtistInternalValues | null;
  recentEnquiries: { id: string; reference: string; contactName: string; status: EnquiryStatus; eventDate: Date }[];
  /** Records that stop a permanent delete (empty = deletable). */
  deleteBlockers: string[];
  permissions: { write: boolean; internal: boolean; delete: boolean };
}

const s = (v: string | null | undefined) => v ?? "";
const n = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

export async function getArtistForAdmin(actor: Actor, artistId: string, now = new Date()): Promise<ArtistDetail | null> {
  authorize(actor, "artist:read");
  const showInternal = can(actor, "artist:internal");
  const row = await db.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      slug: true,
      stageName: true,
      categoryId: true,
      tagline: true,
      shortBio: true,
      biography: true,
      performanceDescription: true,
      profileImageUrl: true,
      coverImageUrl: true,
      languages: true,
      baseCity: true,
      performanceTypes: true,
      eventTypes: true,
      technicalRequirements: true,
      teamSize: true,
      minDurationMinutes: true,
      maxDurationMinutes: true,
      publicPriceVisible: true,
      publicPriceFromPaise: true,
      publicPriceNote: true,
      publicContactApproved: true,
      publicEmail: true,
      publicPhone: true,
      isFeatured: true,
      featuredOrder: true,
      seoTitle: true,
      seoDescription: true,
      status: true,
      archivedAt: true,
      availabilityVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
      // Selected only when permitted, so confidential data never leaves the database otherwise.
      ...(showInternal ? { internal: true } : {}),
      enquiryLinks: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { enquiry: { select: { id: true, reference: true, contactName: true, status: true, eventDate: true } } },
      },
    },
  });
  if (!row) return null;
  const deleteBlockers = can(actor, "artist:delete") ? await findDeleteBlockers(db, row.id) : [];

  const internal = showInternal && "internal" in row ? row.internal : null;
  return {
    id: row.id,
    status: row.status,
    archivedAt: row.archivedAt,
    availabilityVerifiedAt: row.availabilityVerifiedAt,
    availabilityFresh: isFresh(row.availabilityVerifiedAt, now),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    profile: {
      stageName: row.stageName,
      slug: row.slug,
      categoryId: row.categoryId,
      tagline: s(row.tagline),
      shortBio: row.shortBio,
      biography: row.biography,
      performanceDescription: s(row.performanceDescription),
      profileImageUrl: s(row.profileImageUrl),
      coverImageUrl: s(row.coverImageUrl),
      baseCity: row.baseCity,
      languages: row.languages,
      performanceTypes: row.performanceTypes,
      eventTypes: row.eventTypes,
      technicalRequirements: s(row.technicalRequirements),
      teamSize: n(row.teamSize),
      minDurationMinutes: n(row.minDurationMinutes),
      maxDurationMinutes: n(row.maxDurationMinutes),
      publicPriceVisible: row.publicPriceVisible,
      publicPriceFromPaise: row.publicPriceFromPaise?.toString() ?? "",
      publicPriceNote: s(row.publicPriceNote),
      publicContactApproved: row.publicContactApproved,
      publicEmail: s(row.publicEmail),
      publicPhone: s(row.publicPhone),
      isFeatured: row.isFeatured,
      featuredOrder: String(row.featuredOrder),
      seoTitle: s(row.seoTitle),
      seoDescription: s(row.seoDescription),
    },
    internal: showInternal
      ? {
          legalName: s(internal?.legalName),
          contactEmail: s(internal?.contactEmail),
          contactPhone: s(internal?.contactPhone),
          managerName: s(internal?.managerName),
          managerPhone: s(internal?.managerPhone),
          basePricePaise: internal?.basePricePaise?.toString() ?? "",
          commissionType: internal?.commissionType ?? "PERCENTAGE",
          commissionRateBps: internal ? internal.commissionRateBps : 2000,
          commissionFixedPaise: internal?.commissionFixedPaise?.toString() ?? "",
          bankDetailsNote: s(internal?.bankDetailsNote),
          internalNotes: s(internal?.internalNotes),
          updatedAt: internal?.updatedAt ?? null,
        }
      : null,
    recentEnquiries: row.enquiryLinks.map((l) => l.enquiry),
    deleteBlockers,
    permissions: { write: can(actor, "artist:write"), internal: showInternal, delete: can(actor, "artist:delete") },
  };
}

// ───────────────────────────── Writes ─────────────────────────────

function profileData(input: ArtistProfileInput) {
  return {
    stageName: input.stageName,
    categoryId: input.categoryId,
    tagline: input.tagline,
    shortBio: input.shortBio,
    biography: input.biography,
    performanceDescription: input.performanceDescription,
    profileImageUrl: input.profileImageUrl,
    coverImageUrl: input.coverImageUrl,
    baseCity: input.baseCity,
    languages: input.languages,
    performanceTypes: input.performanceTypes,
    eventTypes: [...new Set(input.eventTypes)],
    technicalRequirements: input.technicalRequirements,
    teamSize: input.teamSize,
    minDurationMinutes: input.minDurationMinutes,
    maxDurationMinutes: input.maxDurationMinutes,
    publicPriceVisible: input.publicPriceVisible,
    publicPriceFromPaise: input.publicPriceFrom === null ? null : BigInt(input.publicPriceFrom),
    publicPriceNote: input.publicPriceNote,
    publicContactApproved: input.publicContactApproved,
    publicEmail: input.publicEmail,
    publicPhone: input.publicPhone,
    isFeatured: input.isFeatured,
    featuredOrder: input.featuredOrder,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
  } satisfies Prisma.ArtistUncheckedUpdateInput;
}

async function assertCategory(tx: Tx, categoryId: string) {
  const exists = await tx.artistCategory.count({ where: { id: categoryId } });
  if (!exists) throw new ServiceError("validation_error", "Choose a category.", { categoryId: ["Choose a category."] });
}

const slugTaken = () =>
  new ServiceError("slug_taken", "That web address is already used by another artist.", {
    slug: ["Already used by another artist — choose another."],
  });

/** Explicit slug must be free; an automatic one gets a numeric suffix if needed. */
async function resolveSlug(tx: Tx, requested: string | null, stageName: string, exceptId?: string): Promise<string> {
  if (requested) {
    const clash = await tx.artist.findFirst({ where: { slug: requested, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
    if (clash) throw slugTaken();
    return requested;
  }
  const base = slugify(stageName);
  if (!base) {
    throw new ServiceError("validation_error", "Enter a web address for this artist.", {
      slug: ["Enter a web address using English letters and numbers."],
    });
  }
  const taken = await tx.artist.findMany({
    where: { slug: { startsWith: base }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { slug: true },
  });
  return nextAvailableSlug(base, new Set(taken.map((t) => t.slug)));
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2002";
}

export async function createArtist(
  actor: Actor,
  input: ArtistProfileInput & { status: "ACTIVE" | "INACTIVE" },
): Promise<CatalogueChange & { id: string; slug: string }> {
  authorize(actor, "artist:write");
  try {
    return await db.$transaction(async (tx) => {
      await assertCategory(tx, input.categoryId);
      const slug = await resolveSlug(tx, input.slug, input.stageName);
      const artist = await tx.artist.create({
        data: {
          ...profileData(input),
          slug,
          status: input.status,
          createdById: actor.userId,
          updatedById: actor.userId,
          internal: { create: {} },
        },
        select: { id: true, slug: true },
      });
      await audit({ actorId: actor.userId, action: "artist.created", entityType: "Artist", entityId: artist.id, after: { slug, status: input.status } }, tx);
      return { id: artist.id, slug: artist.slug, slugs: [artist.slug] };
    });
  } catch (error) {
    // Two people creating the same name at once: the unique index is the final guard.
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
}

/**
 * Save the public profile. `expectedUpdatedAt` is the version the editor
 * loaded: if someone else saved in between, the save is refused rather than
 * silently overwriting their changes.
 */
export async function updateArtist(
  actor: Actor,
  input: ArtistProfileInput & { artistId: string; expectedUpdatedAt: string },
): Promise<CatalogueChange & { slug: string }> {
  authorize(actor, "artist:write");
  try {
    return await db.$transaction(async (tx) => {
      const current = await tx.artist.findUnique({ where: { id: input.artistId }, select: { id: true, slug: true, status: true } });
      if (!current) throw notFoundError("Artist");
      await assertCategory(tx, input.categoryId);
      const slug = await resolveSlug(tx, input.slug ?? current.slug, input.stageName, current.id);
      const { count } = await tx.artist.updateMany({
        where: { id: current.id, updatedAt: new Date(input.expectedUpdatedAt) },
        data: { ...profileData(input), slug, updatedById: actor.userId },
      });
      if (count === 0) throw conflictError("Someone else saved this artist while you were editing. Reload to see their changes.");
      if (slug !== current.slug) {
        await audit({ actorId: actor.userId, action: "artist.slug_changed", entityType: "Artist", entityId: current.id, before: { slug: current.slug }, after: { slug } }, tx);
      }
      return { slug, slugs: [...new Set([current.slug, slug])] };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
}

/** Fields compared for the audit trail. Free-text notes and contacts are recorded as "changed", never copied. */
function internalAuditView(v: {
  basePricePaise: bigint | null;
  commissionType: CommissionType;
  commissionRateBps: number | null;
  commissionFixedPaise: bigint | null;
}) {
  return {
    basePricePaise: v.basePricePaise?.toString() ?? null,
    commissionType: v.commissionType,
    commissionRateBps: v.commissionRateBps,
    commissionFixedPaise: v.commissionFixedPaise?.toString() ?? null,
  };
}

const PRIVATE_TEXT_FIELDS = ["legalName", "contactEmail", "contactPhone", "managerName", "managerPhone", "bankDetailsNote", "internalNotes"] as const;

export async function updateArtistInternal(actor: Actor, input: ArtistInternalInput): Promise<void> {
  authorize(actor, "artist:write");
  authorize(actor, "artist:internal");
  await db.$transaction(async (tx) => {
    const artist = await tx.artist.findUnique({ where: { id: input.artistId }, select: { id: true, internal: true } });
    if (!artist) throw notFoundError("Artist");
    const data = {
      legalName: input.legalName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      managerName: input.managerName,
      managerPhone: input.managerPhone,
      basePricePaise: input.basePrice === null ? null : BigInt(input.basePrice),
      commissionType: input.commissionType,
      // Keep only the figure that applies, so reports never read a stale one.
      commissionRateBps: input.commissionType === "PERCENTAGE" ? input.commissionRate : null,
      commissionFixedPaise: input.commissionType === "FIXED" && input.commissionFixed !== null ? BigInt(input.commissionFixed) : null,
      bankDetailsNote: input.bankDetailsNote,
      internalNotes: input.internalNotes,
    };
    await tx.artistInternal.upsert({ where: { artistId: artist.id }, create: { artistId: artist.id, ...data }, update: data });

    const before = artist.internal;
    const changedText = PRIVATE_TEXT_FIELDS.filter((f) => (before?.[f] ?? null) !== data[f]);
    const beforeMoney = before ? internalAuditView(before) : null;
    const afterMoney = internalAuditView(data);
    if (changedText.length || JSON.stringify(beforeMoney) !== JSON.stringify(afterMoney)) {
      await audit(
        {
          actorId: actor.userId,
          action: "artist.internal_updated",
          entityType: "Artist",
          entityId: artist.id,
          before: beforeMoney ?? undefined,
          after: { ...afterMoney, changedFields: changedText },
        },
        tx,
      );
    }
  });
}

/**
 * Status drives public visibility: only ACTIVE artists appear on the website.
 * Conditional on the status the user saw (optimistic concurrency).
 */
export async function setArtistStatus(
  actor: Actor,
  input: { artistId: string; from: ArtistStatus; to: ArtistStatus },
  now = new Date(),
): Promise<CatalogueChange> {
  authorize(actor, "artist:write");
  if (input.from === input.to) throw new ServiceError("invalid_transition", "The artist already has that status.");
  return db.$transaction(async (tx) => {
    const artist = await tx.artist.findUnique({ where: { id: input.artistId }, select: { slug: true } });
    if (!artist) throw notFoundError("Artist");
    const { count } = await tx.artist.updateMany({
      where: { id: input.artistId, status: input.from },
      data: {
        status: input.to,
        archivedAt: input.to === "ARCHIVED" ? now : null,
        // An archived artist can't stay in the featured rail.
        ...(input.to === "ARCHIVED" ? { isFeatured: false } : {}),
        updatedById: actor.userId,
      },
    });
    if (count === 0) throw conflictError("Someone else changed this artist's status. Reload to see the latest.");
    await audit(
      {
        actorId: actor.userId,
        action: "artist.status_changed",
        entityType: "Artist",
        entityId: input.artistId,
        before: { status: input.from },
        after: { status: input.to, label: ARTIST_STATUS_LABELS[input.to] },
      },
      tx,
    );
    return { slugs: [artist.slug] };
  });
}

/** Staff confirmed the artist's calendar is current: shows the "Available" badge for 30 days. */
export async function markArtistAvailabilityVerified(actor: Actor, input: { artistId: string }, now = new Date()): Promise<CatalogueChange> {
  authorize(actor, "artist:write");
  const artist = await db.artist.findUnique({ where: { id: input.artistId }, select: { slug: true } });
  if (!artist) throw notFoundError("Artist");
  await db.artist.update({ where: { id: input.artistId }, data: { availabilityVerifiedAt: now, updatedById: actor.userId } });
  return { slugs: [artist.slug] };
}

// ───────────────────────────── Delete ─────────────────────────────

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * History that must survive, so an artist with any of it can only be archived.
 * Profile media, availability, blackouts and private details are the artist's
 * own data and are deleted with it.
 */
async function findDeleteBlockers(tx: Tx | typeof db, artistId: string): Promise<string[]> {
  const c = await tx.artist.findUnique({
    where: { id: artistId },
    select: {
      portalUser: { select: { id: true } },
      _count: {
        select: {
          enquiryLinks: true,
          sourceEnquiries: true,
          bookingLinks: true,
          payouts: true,
          quotationItems: true,
          testimonials: true,
          files: true,
        },
      },
    },
  });
  if (!c) return [];
  const k = c._count;
  const enquiries = k.enquiryLinks + k.sourceEnquiries;
  return [
    enquiries ? plural(enquiries, "enquiry", "enquiries") : null,
    k.bookingLinks ? plural(k.bookingLinks, "booking") : null,
    k.payouts ? plural(k.payouts, "payout") : null,
    k.quotationItems ? plural(k.quotationItems, "quotation line") : null,
    k.testimonials ? plural(k.testimonials, "testimonial") : null,
    k.files ? plural(k.files, "file") : null,
    c.portalUser ? "a portal login" : null,
  ].filter((b): b is string => b !== null);
}

/**
 * Permanently delete an artist that has no history (e.g. added by mistake).
 * Anything referenced by enquiries, bookings or money must be archived instead.
 */
export async function deleteArtist(actor: Actor, input: { artistId: string; confirmName: string }): Promise<CatalogueChange> {
  authorize(actor, "artist:delete");
  return db.$transaction(async (tx) => {
    const artist = await tx.artist.findUnique({ where: { id: input.artistId }, select: { id: true, slug: true, stageName: true, status: true } });
    if (!artist) throw notFoundError("Artist");
    if (input.confirmName.toLowerCase() !== artist.stageName.trim().toLowerCase()) {
      throw new ServiceError("validation_error", "Type the stage name exactly to confirm.", { confirmName: ["Doesn't match the stage name."] });
    }
    const blockers = await findDeleteBlockers(tx, artist.id);
    if (blockers.length) {
      throw new ServiceError("has_history", `This artist is linked to ${blockers.join(", ")}. Archive them instead so that history stays intact.`);
    }
    await tx.artist.delete({ where: { id: artist.id } });
    await audit(
      {
        actorId: actor.userId,
        action: "artist.deleted",
        entityType: "Artist",
        entityId: artist.id,
        before: { slug: artist.slug, stageName: artist.stageName, status: artist.status },
      },
      tx,
    );
    return { slugs: [artist.slug] };
  });
}
