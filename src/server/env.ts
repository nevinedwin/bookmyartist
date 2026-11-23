import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

/** Blank means "use the default" (so `KEY=""` copied from .env.example is fine). */
const withDefault = <T extends z.ZodType>(inner: T) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), inner);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),

  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
  EMAIL_REPLY_TO: optional,

  // WhatsApp Cloud API (Meta). Without these, WhatsApp alerts are queued and marked SKIPPED.
  WHATSAPP_ACCESS_TOKEN: optional,
  WHATSAPP_PHONE_NUMBER_ID: optional,
  WHATSAPP_TEMPLATE_NEW_ENQUIRY: withDefault(z.string().trim().min(1).default("new_enquiry")),
  WHATSAPP_TEMPLATE_LANGUAGE: withDefault(z.string().trim().min(2).default("en")),
  WHATSAPP_API_VERSION: withDefault(z.string().regex(/^v\d+\.\d+$/).default("v23.0")),

  TURNSTILE_SECRET_KEY: optional,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optional,

  CRON_SECRET: optional,

  CLOUDINARY_CLOUD_NAME: optional,
  CLOUDINARY_API_KEY: optional,
  CLOUDINARY_API_SECRET: optional,

  RAZORPAY_KEY_ID: optional,
  RAZORPAY_KEY_SECRET: optional,
  RAZORPAY_WEBHOOK_SECRET: optional,

  SENTRY_DSN: optional,
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

/** Validated server environment. Throws with a readable message on misconfiguration. */
export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid server environment:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
