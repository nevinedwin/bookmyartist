import { z } from "zod";
import { ClientType } from "@/generated/prisma/enums";
import { lenient, optionalEmail, optionalText, requiredText } from "./common";
import { phoneSchema } from "./users";

export const CLIENT_PAGE_SIZE = 25;

export const clientListParamsSchema = z.object({
  q: lenient(z.string().trim().min(1).max(100)),
  type: lenient(z.enum(ClientType)),
  archived: lenient(z.literal("1")),
  page: lenient(z.coerce.number().int().min(1).max(1000)),
});
export type ClientListParams = z.infer<typeof clientListParamsSchema>;

const optionalPhone = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => v ?? "")
  .pipe(phoneSchema);

const clientFields = z.object({
  name: requiredText(2, 160, "Enter the client's name."),
  email: optionalEmail,
  phone: optionalPhone,
  organization: optionalText(160),
  type: z.enum(ClientType).default("INDIVIDUAL"),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(80),
  state: optionalText(80),
  postalCode: optionalText(12),
  taxId: optionalText(20),
  notes: optionalText(10_000),
});

const needsContact = (v: { email: string | null; phone: string | null }) => Boolean(v.email || v.phone);
const contactIssue = { path: ["email"], message: "Add an email or a phone number." };

/** `allowDuplicate` is sent after staff have seen the possible duplicates and chosen to continue. */
export const createClientSchema = clientFields
  .extend({ allowDuplicate: z.boolean().default(false) })
  .refine(needsContact, contactIssue);
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = clientFields
  .extend({ clientId: z.uuid(), expectedUpdatedAt: z.iso.datetime() })
  .refine(needsContact, contactIssue);
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const clientIdSchema = z.object({ clientId: z.uuid() });
export const setClientArchivedSchema = z.object({ clientId: z.uuid(), archived: z.boolean() });
export const clientSearchSchema = z.object({ q: z.string().trim().min(2).max(100) });

export const linkEnquiryClientSchema = z.object({ enquiryId: z.uuid(), clientId: z.uuid().nullable() });
export const enquiryIdSchema = z.object({ enquiryId: z.uuid() });
