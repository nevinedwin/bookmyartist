import "server-only";
import { hmac, safeEqual } from "./crypto";

/**
 * Signed render timestamp embedded in public forms. Rejects submissions that
 * arrive implausibly fast (bots) or from stale/forged tokens.
 */
const PURPOSE = "form-token";
export const FORM_MIN_FILL_MS = 3_000;
export const FORM_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function issueFormToken(now: number = Date.now()): string {
  const ts = String(now);
  return `${ts}.${hmac(ts, PURPOSE)}`;
}

export type FormTokenCheck = { ok: true } | { ok: false; reason: "invalid" | "too_fast" | "expired" };

export function verifyFormToken(token: string, now: number = Date.now()): FormTokenCheck {
  const [ts, sig] = token.split(".");
  if (!ts || !sig || !/^\d{10,16}$/.test(ts)) return { ok: false, reason: "invalid" };
  if (!safeEqual(sig, hmac(ts, PURPOSE))) return { ok: false, reason: "invalid" };
  const age = now - Number(ts);
  if (age < FORM_MIN_FILL_MS) return { ok: false, reason: "too_fast" };
  if (age > FORM_MAX_AGE_MS) return { ok: false, reason: "expired" };
  return { ok: true };
}
