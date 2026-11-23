/**
 * Session cookie naming and attributes. Plain module (no `server-only`) so
 * proxy.ts can read the cookie name for its optimistic redirect.
 *
 * `__Host-` requires Secure, path "/" and no Domain, which pins the cookie to
 * this exact host. Plain-HTTP localhost (dev, e2e) can't set Secure cookies in
 * every browser, so it uses an unprefixed name without Secure.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const COOKIE_SECURE = !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(siteUrl);
export const SESSION_COOKIE = COOKIE_SECURE ? "__Host-bma_session" : "bma_session";

/** Idle timeout: a session unused this long expires. */
export const SESSION_IDLE_MS = 12 * 60 * 60 * 1000;
/** Absolute lifetime: sign in again after this, however active the session. */
export const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
