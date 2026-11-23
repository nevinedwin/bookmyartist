import { z } from "zod";
import { emailSchema } from "./auth";

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Enter the person's name.").max(120),
  email: emailSchema,
  roleKey: z.string().min(1, "Choose a role.").max(64),
});

export const updateUserRoleSchema = z.object({
  userId: z.uuid(),
  roleKey: z.string().min(1).max(64),
});

export const userIdSchema = z.object({ userId: z.uuid() });

export const setUserStatusSchema = z.object({
  userId: z.uuid(),
  status: z.enum(["ACTIVE", "DISABLED"]),
});

const nameSchema = z.string().trim().min(2, "Enter a name.").max(120, "Keep it under 120 characters.");

/**
 * Optional phone number, normalised to E.164. A bare 10-digit Indian mobile
 * gets +91; anything else must include its country code. Empty clears it.
 */
export const phoneSchema = z
  .string()
  .trim()
  .max(24)
  .transform((v) => v.replace(/[\s\-().]/g, ""))
  .transform((v) => (/^[6-9]\d{9}$/.test(v) ? `+91${v}` : v.replace(/^00/, "+")))
  .refine((v) => v === "" || /^\+[1-9]\d{7,14}$/.test(v), "Enter a valid number with country code, e.g. +91 98765 43210.")
  .refine((v) => !v.startsWith("+91") || /^\+91[6-9]\d{9}$/.test(v), "Enter a valid 10-digit Indian mobile number.")
  .transform((v) => (v === "" ? null : v));

export const updateProfileSchema = z.object({ name: nameSchema, phone: phoneSchema });

export const changeEmailSchema = z.object({
  email: emailSchema,
  currentPassword: z.string().min(1, "Enter your current password.").max(128),
});

export const adminUpdateUserSchema = z.object({
  userId: z.uuid(),
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
});

export const deleteUserSchema = z.object({
  userId: z.uuid(),
  /** Typed by the admin to confirm; must match the account's email. */
  confirmEmail: z.string().trim().toLowerCase().max(254),
});
