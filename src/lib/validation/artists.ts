import { z } from "zod";
import { ArtistStatus, CommissionType, EventType } from "@/generated/prisma/enums";
import { SLUG_PATTERN } from "@/lib/slug";
import {
  lenient,
  optionalEmail,
  optionalImageUrl,
  optionalInt,
  optionalPercentBps,
  optionalRupees,
  optionalText,
  requiredText,
  tagList,
} from "./common";
import { phoneSchema } from "./users";

export const ARTIST_PAGE_SIZE = 25;

export const artistListParamsSchema = z.object({
  q: lenient(z.string().trim().min(1).max(100)),
  status: lenient(z.enum(ArtistStatus)),
  category: lenient(z.uuid()),
  featured: lenient(z.literal("1")),
  archived: lenient(z.literal("1")),
  page: lenient(z.coerce.number().int().min(1).max(1000)),
});
export type ArtistListParams = z.infer<typeof artistListParamsSchema>;

const optionalPhone = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => v ?? "")
  .pipe(phoneSchema);

/** Everything on the public profile. Rendered on the website when the artist is ACTIVE. */
const artistProfileFields = z.object({
  stageName: requiredText(2, 120, "Enter the artist's stage name."),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(80, "Keep the web address under 80 characters.")
      .refine((v) => v === "" || SLUG_PATTERN.test(v), "Use lower-case letters, numbers and single hyphens.")
      .optional()
      .transform((v) => v || null),
    categoryId: z.uuid("Choose a category."),
    tagline: optionalText(140),
    shortBio: requiredText(20, 300, "Write a short bio of at least 20 characters."),
    biography: requiredText(50, 10_000, "Write a biography of at least 50 characters."),
    performanceDescription: optionalText(5000),
    profileImageUrl: optionalImageUrl,
    coverImageUrl: optionalImageUrl,
    baseCity: requiredText(2, 80, "Enter the artist's base city."),
    languages: tagList(12),
    performanceTypes: tagList(12),
    eventTypes: z.array(z.enum(EventType)).max(Object.keys(EventType).length).default([]),
    technicalRequirements: optionalText(5000),
    teamSize: optionalInt(1, 500, "Enter a team size between 1 and 500."),
    minDurationMinutes: optionalInt(5, 1440, "Enter minutes between 5 and 1,440."),
    maxDurationMinutes: optionalInt(5, 1440, "Enter minutes between 5 and 1,440."),
    publicPriceVisible: z.boolean().default(false),
    publicPriceFrom: optionalRupees(),
    publicPriceNote: optionalText(200),
    publicContactApproved: z.boolean().default(false),
    publicEmail: optionalEmail,
    publicPhone: optionalPhone,
    isFeatured: z.boolean().default(false),
    featuredOrder: optionalInt(0, 999, "Enter a number between 0 and 999.").transform((v) => v ?? 0),
    seoTitle: optionalText(70, "Search titles should be under 70 characters."),
    seoDescription: optionalText(160, "Search descriptions should be under 160 characters."),
});

type ProfileFields = z.infer<typeof artistProfileFields>;

function checkProfile(v: ProfileFields, ctx: z.RefinementCtx) {
  if (v.minDurationMinutes !== null && v.maxDurationMinutes !== null && v.minDurationMinutes > v.maxDurationMinutes) {
    ctx.addIssue({ code: "custom", path: ["maxDurationMinutes"], message: "Must be at least the minimum duration." });
  }
  if (v.publicPriceVisible && v.publicPriceFrom === null) {
    ctx.addIssue({ code: "custom", path: ["publicPriceFrom"], message: "Enter the starting price to show it publicly." });
  }
  if (v.publicContactApproved && !v.publicEmail && !v.publicPhone) {
    ctx.addIssue({ code: "custom", path: ["publicEmail"], message: "Add an email or phone to show contact details." });
  }
}

export const artistProfileSchema = artistProfileFields.superRefine(checkProfile);
export type ArtistProfileInput = z.infer<typeof artistProfileSchema>;

/** New artists start off the website unless staff publish them straight away. */
export const createArtistSchema = artistProfileFields
  .extend({ status: z.enum(["ACTIVE", "INACTIVE"]).default("INACTIVE") })
  .superRefine(checkProfile);

/** `expectedUpdatedAt` is the version the editor loaded; stale saves are refused. */
export const updateArtistSchema = artistProfileFields
  .extend({ artistId: z.uuid(), expectedUpdatedAt: z.iso.datetime() })
  .superRefine(checkProfile);

/** Confidential data (`artist:internal`). Never rendered publicly. */
export const artistInternalSchema = z
  .object({
    artistId: z.uuid(),
    legalName: optionalText(160),
    contactEmail: optionalEmail,
    contactPhone: optionalPhone,
    managerName: optionalText(120),
    managerPhone: optionalPhone,
    basePrice: optionalRupees(),
    commissionType: z.enum(CommissionType),
    commissionRate: optionalPercentBps(),
    commissionFixed: optionalRupees(),
    bankDetailsNote: optionalText(500),
    internalNotes: optionalText(10_000),
  })
  .superRefine((v, ctx) => {
    if (v.commissionType === "FIXED" && v.commissionFixed === null) {
      ctx.addIssue({ code: "custom", path: ["commissionFixed"], message: "Enter the fixed commission." });
    }
    if (v.commissionType === "PERCENTAGE" && v.commissionRate === null) {
      ctx.addIssue({ code: "custom", path: ["commissionRate"], message: "Enter the commission percentage." });
    }
  });
export type ArtistInternalInput = z.infer<typeof artistInternalSchema>;

export const setArtistStatusSchema = z.object({
  artistId: z.uuid(),
  from: z.enum(ArtistStatus),
  to: z.enum(ArtistStatus),
});

export const artistIdSchema = z.object({ artistId: z.uuid() });

export const deleteArtistSchema = z.object({
  artistId: z.uuid(),
  /** Typed by the user to confirm; must match the stage name. */
  confirmName: z.string().trim().max(120),
});
