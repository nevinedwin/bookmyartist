import { SLUG_PATTERN } from "@/lib/slug";
import { db } from "@/server/db";

/**
 * Per-instance set of ACTIVE artist slugs, refreshed at most once a minute.
 * Used by proxy.ts to return a real HTTP 404 for unknown profiles without a
 * database query on every request (ADR-015).
 *
 * The set lives on `globalThis` because proxy.ts and Server Actions are
 * bundled separately: a module-level variable would give each its own copy,
 * and an admin's "publish" could never reset the one the proxy reads.
 */
const TTL_MS = 60_000;

interface SlugCache {
  slugs?: Set<string>;
  expiresAt: number;
  inflight?: Promise<Set<string>>;
  /** Bumped on invalidation so a fetch that started earlier can't store a stale set. */
  generation: number;
}

const KEY = Symbol.for("bookmyartist.activeArtistSlugs");
const store = globalThis as unknown as { [KEY]?: SlugCache };
const state = (): SlugCache => (store[KEY] ??= { expiresAt: 0, generation: 0 });

export async function activeArtistSlugs(): Promise<Set<string>> {
  const s = state();
  if (s.slugs && s.expiresAt > Date.now()) return s.slugs;
  const generation = s.generation;
  s.inflight ??= db.artist
    .findMany({ where: { status: "ACTIVE" }, select: { slug: true } })
    .then((rows) => {
      const slugs = new Set(rows.map((r) => r.slug));
      if (state().generation === generation) Object.assign(state(), { slugs, expiresAt: Date.now() + TTL_MS });
      return slugs;
    })
    .finally(() => {
      state().inflight = undefined;
    });
  return s.inflight;
}

/**
 * True if `slug` belongs to a published artist. A miss is confirmed with one
 * indexed lookup before the proxy answers 404, so an artist published on any
 * instance is reachable immediately. Malformed slugs never touch the database.
 */
export async function isActiveArtistSlug(slug: string): Promise<boolean> {
  if (!SLUG_PATTERN.test(slug) || slug.length > 80) return false;
  const slugs = await activeArtistSlugs();
  if (slugs.has(slug)) return true;
  const found = (await db.artist.count({ where: { slug, status: "ACTIVE" } })) > 0;
  if (found) slugs.add(slug);
  return found;
}

/**
 * Forget the cached set in this process after an admin publishes, renames or
 * unpublishes an artist. Other instances drop an unpublished slug within the
 * TTL (until then the page itself renders not-found, with a 200 status).
 */
export function invalidateActiveArtistSlugs(): void {
  const s = state();
  Object.assign(s, { slugs: undefined, expiresAt: 0, inflight: undefined, generation: s.generation + 1 });
}
