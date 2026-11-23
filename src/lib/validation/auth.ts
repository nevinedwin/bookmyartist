import { z } from "zod";

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

/** A short blocklist of passwords that satisfy the length rule but are guessed first. */
const COMMON = new Set([
  "password1234", "password12345", "password123456", "123456789012", "1234567890123",
  "qwertyuiop12", "letmein12345", "welcome12345", "administrator", "admin1234567",
  "iloveyou1234", "changeme1234", "bookmyartist", "bookmyartist1", "bookmyartist123",
]);

/**
 * Password policy (NIST SP 800-63B style): length over composition rules.
 * 12–128 characters, not a well-known password, not mostly one repeated character.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`)
  .refine((v) => !COMMON.has(v.toLowerCase()), "This password is too common. Choose another.")
  .refine((v) => new Set(v).size >= 5, "Use a less repetitive password.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address.").max(254));

export const loginSchema = z.object({
  email: emailSchema,
  // Not the policy schema: existing passwords are checked as entered.
  password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX),
  next: z.string().max(500).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(PASSWORD_MAX),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords don't match.",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password you haven't used here.",
  });

/** Only same-site admin paths are allowed as post-login destinations (no open redirects). */
export function safeAdminRedirect(next: string | null | undefined): string {
  if (!next || !next.startsWith("/admin") || next.startsWith("//") || next.includes("\\")) return "/admin";
  if (next.startsWith("/admin/login")) return "/admin";
  return next;
}
