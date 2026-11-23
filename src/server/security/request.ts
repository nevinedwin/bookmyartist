import "server-only";

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for / x-real-ip). */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || null;
}

export function getUserAgent(headers: Headers): string | null {
  return headers.get("user-agent")?.slice(0, 300) ?? null;
}
