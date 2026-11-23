import { z } from "zod";
import { EventType } from "@/generated/prisma/enums";
import { BUDGET_RANGES } from "@/lib/labels";

/**
 * Public enquiry schema — shared by the multi-step form (client-side hints)
 * and the API route (authoritative server-side validation).
 */

export const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+974", label: "Qatar (+974)" },
  { code: "+966", label: "Saudi Arabia (+966)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+44", label: "United Kingdom (+44)" },
  { code: "+1", label: "USA / Canada (+1)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+977", label: "Nepal (+977)" },
  { code: "+94", label: "Sri Lanka (+94)" },
] as const;

export const PUBLIC_ENQUIRY_SOURCES = ["BOOKING_FORM", "ARTIST_PROFILE", "SERVICE_PAGE", "CONTACT_PAGE"] as const;

const MAX_EVENT_YEARS_AHEAD = 3;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters`)
    .optional()
    .transform((v) => (v ? v : undefined));

const optionalInt = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z
      .number({ error: `${label} must be a number` })
      .int(`${label} must be a whole number`)
      .min(min, `${label} must be at least ${min}`)
      .max(max, `${label} must be at most ${max.toLocaleString("en-IN")}`)
      .optional(),
  );

const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]{1,80}$/, "Invalid selection")
  .optional()
  .or(z.literal("").transform(() => undefined));

/** "YYYY-MM-DD" not in the past (relative to `today`) and within a sensible horizon. */
export function eventDateSchema(today: string) {
  const maxYear = Number(today.slice(0, 4)) + MAX_EVENT_YEARS_AHEAD;
  return z
    .string({ error: "Please choose the event date" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose the event date")
    .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "Please choose a valid date")
    .refine((d) => d >= today, "The event date can't be in the past")
    .refine((d) => Number(d.slice(0, 4)) <= maxYear, `Please choose a date within ${MAX_EVENT_YEARS_AHEAD} years`);
}

export const eventDetailsShape = {
  eventType: z.enum(EventType, { error: "Please choose the type of event" }),
  eventCity: z
    .string({ error: "Please tell us the city" })
    .trim()
    .min(2, "Please tell us the city")
    .max(80, "City name is too long"),
  venue: optionalText(160),
  audienceSize: optionalInt(1, 200_000, "Audience size"),
};

export const requirementsShape = {
  categorySlug: slug,
  artistSlug: slug,
  performanceType: optionalText(120),
  performersCount: optionalInt(1, 200, "Number of performers"),
  durationMinutes: optionalInt(10, 24 * 60, "Duration"),
  additionalRequirements: optionalText(2000),
};

const budgetIds = BUDGET_RANGES.map((b) => b.id) as [string, ...string[]];

export const contactShape = {
  budget: z.enum(budgetIds).optional().or(z.literal("").transform(() => undefined)),
  name: z
    .string({ error: "Please tell us your name" })
    .trim()
    .min(2, "Please tell us your name")
    .max(100, "Name is too long"),
  email: z
    .string({ error: "Please enter your email" })
    .trim()
    .toLowerCase()
    .pipe(z.email("Please enter a valid email address").max(254)),
  phoneCountryCode: z.enum(COUNTRY_CODES.map((c) => c.code) as [string, ...string[]], {
    error: "Please choose a country code",
  }),
  phone: z
    .string({ error: "Please enter your phone number" })
    .trim()
    .transform((v) => v.replace(/[\s()-]/g, ""))
    .pipe(z.string().regex(/^\d{6,14}$/, "Please enter a valid phone number")),
  organization: optionalText(120),
  message: optionalText(2000),
  consent: z.literal(true, { error: "Please agree so we can contact you about your event" }),
};

export const metaShape = {
  source: z.enum(PUBLIC_ENQUIRY_SOURCES).default("BOOKING_FORM"),
  sourcePath: z
    .string()
    .trim()
    .max(200)
    .regex(/^\/[A-Za-z0-9\-/_?=&%.]*$/, "Invalid path")
    .optional(),
  serviceSlug: slug,
  /** Honeypot — real users never see or fill this field. */
  website: z.string().max(0).optional().or(z.literal("")),
  /** Signed render timestamp (anti-bot timing check). */
  formToken: z.string().max(200),
  turnstileToken: z.string().max(4096).optional(),
};

export function publicEnquirySchema(today: string) {
  return z
    .object({
      ...eventDetailsShape,
      eventDate: eventDateSchema(today),
      ...requirementsShape,
      ...contactShape,
      ...metaShape,
    })
    .superRefine((data, ctx) => {
      if (data.phoneCountryCode === "+91" && !/^[6-9]\d{9}$/.test(data.phone)) {
        ctx.addIssue({ code: "custom", path: ["phone"], message: "Please enter a valid 10-digit Indian mobile number" });
      }
      if (`${data.phoneCountryCode}${data.phone}`.replace("+", "").length > 15) {
        ctx.addIssue({ code: "custom", path: ["phone"], message: "Phone number is too long" });
      }
    });
}

export type PublicEnquiryInput = z.input<ReturnType<typeof publicEnquirySchema>>;
export type PublicEnquiry = z.output<ReturnType<typeof publicEnquirySchema>>;

/** Field groups per wizard step, used to validate one step at a time on the client. */
export const ENQUIRY_STEP_FIELDS = {
  event: ["eventType", "eventDate", "eventCity", "venue", "audienceSize"],
  requirements: ["categorySlug", "artistSlug", "performanceType", "performersCount", "durationMinutes", "additionalRequirements"],
  contact: ["budget", "name", "email", "phoneCountryCode", "phone", "organization", "message", "consent"],
} as const;

export function toE164(countryCode: string, phone: string): string {
  return `${countryCode}${phone.replace(/^0+/, "")}`;
}
