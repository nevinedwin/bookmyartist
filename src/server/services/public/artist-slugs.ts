import { db } from "@/server/db";

/**
 * Per-instance set of ACTIVE artist slugs, refreshed at most once a minute.
 * Used by proxy.ts to return a real HTTP 404 for unknown profiles without a
 * database query on every request.
 */
const TTL_MS = 60_000;
let cache: { slugs: Set<string>; expiresAt: number } | undefined;
let inflight: Promise<Set<string>> | undefined;

export async function activeArtistSlugs(): Promise<Set<string>> {
  if (cache && cache.expiresAt > Date.now()) return cache.slugs;
  inflight ??= db.artist
    .findMany({ where: { status: "ACTIVE" }, select: { slug: true } })
    .then((rows) => {
      const slugs = new Set(rows.map((r) => r.slug));
      cache = { slugs, expiresAt: Date.now() + TTL_MS };
      return slugs;
    })
    .finally(() => {
      inflight = undefined;
    });
  return inflight;
}
