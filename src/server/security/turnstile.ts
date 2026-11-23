import "server-only";
import { env } from "@/server/env";

/**
 * Cloudflare Turnstile verification. Only enforced when TURNSTILE_SECRET_KEY
 * is configured; otherwise honeypot + timing + rate limits apply.
 */
export function isTurnstileEnabled(): boolean {
  return Boolean(env().TURNSTILE_SECRET_KEY && env().NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export async function verifyTurnstile(token: string | undefined, ip: string | null): Promise<boolean> {
  const secret = env().TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}
