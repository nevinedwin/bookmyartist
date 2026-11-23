import { z } from "zod";
import { emailSchema } from "./auth";
import { phoneSchema } from "./users";

const MAX_RECIPIENTS = 10;

/** One entry per line or comma; blank lines ignored; duplicates removed. */
const lines = (v: string) => [...new Set(v.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean))];

export const alertSettingsSchema = z.object({
  emails: z
    .string()
    .max(5000)
    .transform(lines)
    .pipe(z.array(emailSchema).max(MAX_RECIPIENTS, `Add at most ${MAX_RECIPIENTS} addresses.`))
    .transform((list) => [...new Set(list)]),
  whatsapp: z
    .string()
    .max(1000)
    .transform(lines)
    .pipe(z.array(phoneSchema.refine((v): v is string => v !== null)).max(MAX_RECIPIENTS, `Add at most ${MAX_RECIPIENTS} numbers.`))
    .transform((list) => [...new Set(list as string[])]),
});
export type AlertSettingsInput = z.infer<typeof alertSettingsSchema>;
