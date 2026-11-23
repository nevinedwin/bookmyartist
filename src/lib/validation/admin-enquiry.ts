import { z } from "zod";
import { EnquirySource, EnquiryStatus, LostReason, Priority } from "@/generated/prisma/enums";

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
