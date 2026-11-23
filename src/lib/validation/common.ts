import { z } from "zod";
import { rupeesToPaise } from "@/lib/money";

/** Optional free text: trimmed, empty becomes null. */
export const optionalText = (max: number, message = `Keep it under ${max.toLocaleString("en-IN")} characters.`) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export const requiredText = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max, `Keep it under ${max.toLocaleString("en-IN")} characters.`);

/** Optional whole number from a form string ("" → null). */
export const optionalInt = (min: number, max: number, message: string) =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => (v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= min && v <= max), message);

/**
 * Optional rupee amount as typed by staff ("1,50,000", "2500.50") → paise as a
 * decimal string, so money never passes through a JS number.
 */
export const optionalRupees = (message = "Enter an amount in rupees, e.g. 1,50,000.") =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v, ctx) => {
      const raw = (v ?? "").trim();
      if (raw === "") return null;
      try {
        const paise = rupeesToPaise(raw);
        if (paise < 0n || paise > 100_000_000_000n) throw new RangeError("out of range");
        return paise.toString();
      } catch {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
    });

/** "20" / "12.5" percent → basis points (2000 / 1250). Up to two decimals, 0–100%. */
export const optionalPercentBps = (message = "Enter a percentage between 0 and 100.") =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v, ctx) => {
      const raw = (v ?? "").replace("%", "").trim();
      if (raw === "") return null;
      const m = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(raw);
      const bps = m ? Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0")) : NaN;
      if (!m || bps > 10_000) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return bps;
    });

/** Image hosts next/image and the CSP allow (see next.config.ts). */
export const IMAGE_HOSTS = ["images.unsplash.com", "res.cloudinary.com"] as const;

export const optionalImageUrl = z
  .string()
  .trim()
  .max(1000)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null)
  .refine((v) => {
    if (v === null) return true;
    try {
      const url = new URL(v);
      return url.protocol === "https:" && (IMAGE_HOSTS as readonly string[]).includes(url.hostname);
    } catch {
      return false;
    }
  }, `Use an https image link from ${IMAGE_HOSTS.join(" or ")}.`);

/** Optional email, lower-cased; empty becomes null. */
export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null)
  .refine((v) => v === null || z.email().safeParse(v).success, "Enter a valid email address.");

/** "Hindi, English , hindi" → ["Hindi", "English"] (trimmed, de-duplicated case-insensitively). */
export const tagList = (maxItems: number, maxLength = 40) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      const parts = (Array.isArray(v) ? v : (v ?? "").split(",")).map((s) => s.trim().replace(/\s+/g, " ")).filter(Boolean);
      const seen = new Set<string>();
      return parts.filter((p) => {
        const k = p.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    })
    .refine((v) => v.length <= maxItems, `Add at most ${maxItems}.`)
    .refine((v) => v.every((p) => p.length <= maxLength), `Keep each one under ${maxLength} characters.`);

export const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time.");

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
/** For URL search params: bad values are ignored, never errors. */
export const lenient = <T extends z.ZodType>(schema: T) => z.preprocess(first, schema.optional().catch(undefined));
