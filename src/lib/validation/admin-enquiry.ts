import { z } from "zod";
import { EnquirySource, EnquiryStatus, EventType, LostReason, Priority } from "@/generated/prisma/enums";
import { emailSchema } from "./auth";
import { optionalInt, optionalRupees, optionalText, requiredText } from "./common";
import { phoneSchema } from "./users";

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const lenient = <T extends z.ZodType>(schema: T) => z.preprocess(first, schema.optional().catch(undefined));

export const ENQUIRY_VIEWS = ["table", "board"] as const;
export const FOLLOW_UP_FILTERS = ["due", "none"] as const;
export const ENQUIRY_PAGE_SIZE = 25;

/** Lenient parser for /admin/enquiries query params: bad values are ignored, never errors. */
export const enquiryListParamsSchema = z.object({
  q: lenient(z.string().trim().min(1).max(100)),
  status: lenient(z.enum(EnquiryStatus)),
  /** "me", "unassigned" or a user id */
  owner: lenient(z.union([z.literal("me"), z.literal("unassigned"), z.uuid()])),
  priority: lenient(z.enum(Priority)),
  source: lenient(z.enum(EnquirySource)),
  followUp: lenient(z.enum(FOLLOW_UP_FILTERS)),
  closed: lenient(z.literal("1")),
  view: lenient(z.enum(ENQUIRY_VIEWS)),
  page: lenient(z.coerce.number().int().min(1).max(1000)),
});
export type EnquiryListParams = z.infer<typeof enquiryListParamsSchema>;

const id = z.uuid();
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time.");

export const changeStatusSchema = z
  .object({
    enquiryId: id,
    from: z.enum(EnquiryStatus),
    to: z.enum(EnquiryStatus),
    lostReason: z.enum(LostReason).optional(),
    lostReasonNote: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.to !== "LOST" || !!v.lostReason, { path: ["lostReason"], message: "Choose why it was lost." });

export const assignOwnerSchema = z.object({ enquiryId: id, ownerId: id.nullable() });
export const setPrioritySchema = z.object({ enquiryId: id, priority: z.enum(Priority) });
export const setFollowUpSchema = z.object({ enquiryId: id, at: localDateTime.nullable() });

export const addNoteSchema = z.object({
  enquiryId: id,
  body: z.string().trim().min(1, "Write a note.").max(5000, "Keep notes under 5,000 characters."),
});

export const CONTACT_LOG_TYPES = ["CALL", "EMAIL", "WHATSAPP", "MEETING"] as const;
export const logContactSchema = z.object({
  enquiryId: id,
  type: z.enum(CONTACT_LOG_TYPES),
  summary: z.string().trim().min(1, "Describe the conversation.").max(2000),
});

export const togglePinSchema = z.object({ noteId: id, pinned: z.boolean() });

/**
 * Staff corrections to an enquiry. The customer's own message stays as sent.
 * Unlike the public form, past event dates are allowed (fixing old records).
 */
export const updateEnquirySchema = z
  .object({
    enquiryId: id,
    expectedUpdatedAt: z.iso.datetime(),
    contactName: requiredText(2, 100, "Enter the customer's name."),
    contactEmail: emailSchema,
    contactPhone: z
      .string()
      .pipe(phoneSchema)
      .refine((v): v is string => v !== null, "Enter a phone number."),
    organization: optionalText(120),
    eventType: z.enum(EventType),
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the event date.")
      .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "Choose a valid date."),
    eventCity: requiredText(2, 80, "Enter the event city."),
    venue: optionalText(160),
    audienceSize: optionalInt(1, 200_000, "Enter a number between 1 and 2,00,000."),
    categoryId: z.uuid().nullable().default(null),
    performanceType: optionalText(120),
    performersCount: optionalInt(1, 200, "Enter a number between 1 and 200."),
    durationMinutes: optionalInt(10, 1440, "Enter minutes between 10 and 1,440."),
    additionalRequirements: optionalText(2000),
    budgetMin: optionalRupees(),
    budgetMax: optionalRupees(),
  })
  .refine((v) => v.budgetMin === null || v.budgetMax === null || BigInt(v.budgetMin) <= BigInt(v.budgetMax), {
    path: ["budgetMax"],
    message: "Must be at least the minimum budget.",
  });
export type UpdateEnquiryInput = z.infer<typeof updateEnquirySchema>;

export const deleteEnquirySchema = z.object({
  enquiryId: id,
  /** Typed by the user to confirm; must match the reference. */
  confirmReference: z.string().trim().toUpperCase().max(40),
});
