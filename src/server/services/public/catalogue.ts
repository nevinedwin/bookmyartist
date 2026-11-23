import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import type { EventType } from "@/generated/prisma/enums";
import { BUDGET_RANGES, type BudgetRangeId } from "@/lib/labels";
import { rupees } from "@/lib/money";
import { db } from "@/server/db";

/**
 * Public catalogue reads. Every query uses an explicit `select` whitelist and
 * only returns ACTIVE artists. Nothing here may touch `ArtistInternal`.
 * Results are cached and invalidated via tags when admins edit content.
 */

export const CATALOGUE_TAGS = {
  artists: "artists",
  artist: (slug: string) => `artist:${slug}`,
  categories: "categories",
  testimonials: "testimonials",
} as const;

const AVAILABILITY_FRESH_DAYS = 30;
export const ARTISTS_PAGE_SIZE = 12;

const cardSelect = {
  id: true,
  slug: true,
  stageName: true,
  tagline: true,
  shortBio: true,
  baseCity: true,
  profileImageUrl: true,
  coverImageUrl: true,
  isFeatured: true,
  eventTypes: true,
  publicPriceVisible: true,
  publicPriceFromPaise: true,
  availabilityVerifiedAt: true,
  category: { select: { slug: true, name: true } },
} satisfies Prisma.ArtistSelect;

type CardRow = Prisma.ArtistGetPayload<{ select: typeof cardSelect }>;

export interface PublicArtistCard {
  id: string;
  slug: string;
  stageName: string;
  tagline: string | null;
  shortBio: string;
  baseCity: string;
  imageUrl: string | null;
  coverUrl: string | null;
  isFeatured: boolean;
  eventTypes: EventType[];
  category: { slug: string; name: string };
  /** Paise as string; present only when the agency approved public pricing. */
  priceFromPaise: string | null;
  availabilityVerified: boolean;
}

function isAvailabilityFresh(verifiedAt: Date | null, now = Date.now()): boolean {
  if (!verifiedAt) return false;
  return now - verifiedAt.getTime() <= AVAILABILITY_FRESH_DAYS * 86_400_000;
}

function toCard(row: CardRow): PublicArtistCard {
  return {
    id: row.id,
    slug: row.slug,
    stageName: row.stageName,
    tagline: row.tagline,
    shortBio: row.shortBio,
    baseCity: row.baseCity,
    imageUrl: row.profileImageUrl,
    coverUrl: row.coverImageUrl,
    isFeatured: row.isFeatured,
    eventTypes: row.eventTypes,
    category: row.category,
    priceFromPaise:
      row.publicPriceVisible && row.publicPriceFromPaise !== null ? row.publicPriceFromPaise.toString() : null,
    availabilityVerified: isAvailabilityFresh(row.availabilityVerifiedAt),
  };
}

const ACTIVE = { status: "ACTIVE" } satisfies Prisma.ArtistWhereInput;

export async function getFeaturedArtists(limit = 8): Promise<PublicArtistCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOGUE_TAGS.artists);

  const rows = await db.artist.findMany({
    where: { ...ACTIVE, isFeatured: true },
    orderBy: [{ featuredOrder: "asc" }, { stageName: "asc" }],
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}

export interface ArtistFilters {
  q?: string;
  category?: string;
  city?: string;
  eventType?: EventType;
  performanceType?: string;
  availableOnly?: boolean;
  budget?: BudgetRangeId;
  page?: number;
}

export interface ArtistSearchResult {
  artists: PublicArtistCard[];
  total: number;
  page: number;
  pageCount: number;
}

export async function searchArtists(filters: ArtistFilters): Promise<ArtistSearchResult> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOGUE_TAGS.artists);

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const and: Prisma.ArtistWhereInput[] = [ACTIVE];

  const q = filters.q?.trim();
  if (q) {
    and.push({
      OR: [
        { stageName: { contains: q, mode: "insensitive" } },
        { tagline: { contains: q, mode: "insensitive" } },
        { shortBio: { contains: q, mode: "insensitive" } },
        { baseCity: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { performanceTypes: { has: q } },
      ],
    });
  }
  if (filters.category) and.push({ category: { slug: filters.category } });
  if (filters.city) and.push({ baseCity: { equals: filters.city, mode: "insensitive" } });
  if (filters.eventType) and.push({ eventTypes: { has: filters.eventType } });
  if (filters.performanceType) and.push({ performanceTypes: { has: filters.performanceType } });
  if (filters.availableOnly) {
    and.push({ availabilityVerifiedAt: { gte: new Date(Date.now() - AVAILABILITY_FRESH_DAYS * 86_400_000) } });
  }
  if (filters.budget) {
    const range = BUDGET_RANGES.find((r) => r.id === filters.budget);
    // Budget filtering only applies to artists with approved public pricing.
    if (range) {
      and.push({ publicPriceVisible: true, publicPriceFromPaise: { not: null } });
      if (range.max !== null) and.push({ publicPriceFromPaise: { lte: rupees(range.max) } });
    }
  }

  const where: Prisma.ArtistWhereInput = { AND: and };
  const [total, rows] = await Promise.all([
    db.artist.count({ where }),
    db.artist.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { featuredOrder: "asc" }, { stageName: "asc" }],
      skip: (page - 1) * ARTISTS_PAGE_SIZE,
      take: ARTISTS_PAGE_SIZE,
      select: cardSelect,
    }),
  ]);

  return {
    artists: rows.map(toCard),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ARTISTS_PAGE_SIZE)),
  };
}

export interface ArtistFacets {
  cities: string[];
  performanceTypes: string[];
}

export async function getArtistFacets(): Promise<ArtistFacets> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOGUE_TAGS.artists);

  const rows = await db.artist.findMany({
    where: ACTIVE,
    select: { baseCity: true, performanceTypes: true },
  });
  const cities = [...new Set(rows.map((r) => r.baseCity))].sort((a, b) => a.localeCompare(b));
  const performanceTypes = [...new Set(rows.flatMap((r) => r.performanceTypes))].sort((a, b) =>
    a.localeCompare(b),
  );
  return { cities, performanceTypes };
}

export interface PublicMedia {
  id: string;
  type: "IMAGE" | "VIDEO" | "AUDIO";
  provider: "CLOUDINARY" | "YOUTUBE" | "VIMEO" | "EXTERNAL";
  url: string;
  providerId: string | null;
  thumbnailUrl: string | null;
  title: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
}

export interface PublicArtistProfile extends PublicArtistCard {
  biography: string;
  performanceDescription: string | null;
  languages: string[];
  performanceTypes: string[];
  technicalRequirements: string | null;
  teamSize: number | null;
  minDurationMinutes: number | null;
  maxDurationMinutes: number | null;
  priceNote: string | null;
  publicContact: { email: string | null; phone: string | null } | null;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
  media: PublicMedia[];
}

const mediaSelect = {
  id: true,
  type: true,
  provider: true,
  url: true,
  providerId: true,
  thumbnailUrl: true,
  title: true,
  alt: true,
  width: true,
  height: true,
} satisfies Prisma.ArtistMediaSelect;

export async function getArtistProfile(slug: string): Promise<PublicArtistProfile | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOGUE_TAGS.artists, CATALOGUE_TAGS.artist(slug));

  const row = await db.artist.findFirst({
    where: { ...ACTIVE, slug },
    select: {
      ...cardSelect,
      biography: true,
      performanceDescription: true,
      languages: true,
      performanceTypes: true,
      technicalRequirements: true,
      teamSize: true,
      minDurationMinutes: true,
      maxDurationMinutes: true,
      publicPriceNote: true,
      publicContactApproved: true,
      publicEmail: true,
      publicPhone: true,
      seoTitle: true,
      seoDescription: true,
      updatedAt: true,
      media: { where: { isPublic: true }, orderBy: { sortOrder: "asc" }, select: mediaSelect },
    },
  });
  if (!row) return null;

  return {
    ...toCard(row),
    biography: row.biography,
    performanceDescription: row.performanceDescription,
    languages: row.languages,
    performanceTypes: row.performanceTypes,
    technicalRequirements: row.technicalRequirements,
    teamSize: row.teamSize,
    minDurationMinutes: row.minDurationMinutes,
    maxDurationMinutes: row.maxDurationMinutes,
    priceNote: row.publicPriceVisible ? row.publicPriceNote : null,
    publicContact: row.publicContactApproved ? { email: row.publicEmail, phone: row.publicPhone } : null,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    updatedAt: row.updatedAt.toISOString(),
    media: row.media,
  };
}

export async function getRelatedArtists(slug: string, categorySlug: string, limit = 3): Promise<PublicArtistCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOGUE_TAGS.artists);

  const rows = await db.artist.findMany({
    where: { ...ACTIVE, slug: { not: slug }, category: { slug: categorySlug } },
    orderBy: [{ isFeatured: "desc" }, { stageName: "asc" }],
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}

export async function getArtistsForEventType(eventType: EventType, limit = 6): Promise<PublicArtistCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOGUE_TAGS.artists);

  const rows = await db.artist.findMany({
    where: { ...ACTIVE, eventTypes: { has: eventType } },
    orderBy: [{ isFeatured: "desc" }, { featuredOrder: "asc" }, { stageName: "asc" }],
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}

/** Lightweight list for the enquiry form's artist picker. */
export async function getArtistOptions(): Promise<{ slug: string; stageName: string; categorySlug: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOGUE_TAGS.artists);

  const rows = await db.artist.findMany({
    where: ACTIVE,
    orderBy: { stageName: "asc" },
    select: { slug: true, stageName: true, category: { select: { slug: true } } },
  });
  return rows.map((r) => ({ slug: r.slug, stageName: r.stageName, categorySlug: r.category.slug }));
}

export async function getAllArtistSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOGUE_TAGS.artists);

  return db.artist.findMany({ where: ACTIVE, select: { slug: true, updatedAt: true } });
}

export interface PublicCategory {
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  artistCount: number;
}

export async function getCategories(): Promise<PublicCategory[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOGUE_TAGS.categories, CATALOGUE_TAGS.artists);

  const rows = await db.artistCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      imageUrl: true,
      _count: { select: { artists: { where: ACTIVE } } },
    },
  });
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    description: r.description,
    imageUrl: r.imageUrl,
    artistCount: r._count.artists,
  }));
}

export interface PublicTestimonial {
  id: string;
  quote: string;
  authorName: string;
  authorRole: string | null;
  eventType: EventType | null;
  artist: { slug: string; stageName: string } | null;
}

export async function getTestimonials(limit = 6): Promise<PublicTestimonial[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOGUE_TAGS.testimonials);

  const rows = await db.testimonial.findMany({
    where: { isPublished: true, OR: [{ artistId: null }, { artist: ACTIVE }] },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      quote: true,
      authorName: true,
      authorRole: true,
      eventType: true,
      artist: { select: { slug: true, stageName: true } },
    },
  });
  return rows;
}

export interface ShowcaseItem {
  id: string;
  url: string;
  alt: string | null;
  type: "IMAGE" | "VIDEO" | "AUDIO";
  artist: { slug: string; stageName: string; categoryName: string };
}

/** Homepage "featured performances" — showcase media, falling back to featured artist covers. */
export async function getShowcase(limit = 6): Promise<ShowcaseItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOGUE_TAGS.artists);

  const media = await db.artistMedia.findMany({
    where: { isPublic: true, type: "IMAGE", artist: ACTIVE },
    orderBy: [{ isShowcase: "desc" }, { sortOrder: "asc" }],
    distinct: ["artistId"],
    take: limit,
    select: {
      id: true,
      url: true,
      alt: true,
      type: true,
      artist: { select: { slug: true, stageName: true, category: { select: { name: true } } } },
    },
  });
  return media.map((m) => ({
    id: m.id,
    url: m.url,
    alt: m.alt,
    type: m.type,
    artist: { slug: m.artist.slug, stageName: m.artist.stageName, categoryName: m.artist.category.name },
  }));
}

export async function getCatalogueStats(): Promise<{ artists: number; categories: number; cities: number }> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOGUE_TAGS.artists);

  const [artists, categories, cities] = await Promise.all([
    db.artist.count({ where: ACTIVE }),
    db.artistCategory.count({ where: { isActive: true, artists: { some: ACTIVE } } }),
    db.artist.findMany({ where: ACTIVE, distinct: ["baseCity"], select: { baseCity: true } }),
  ]);
  return { artists, categories, cities: cities.length };
}
