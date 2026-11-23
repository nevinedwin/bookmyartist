"use server";

import { refresh, updateTag } from "next/cache";
import type { ApiResult } from "@/lib/api";
import {
  artistIdSchema,
  artistInternalSchema,
  createArtistSchema,
  deleteArtistSchema,
  setArtistStatusSchema,
  updateArtistSchema,
} from "@/lib/validation/artists";
import { requireActor } from "@/server/auth/dal";
import {
  type CatalogueChange,
  createArtist,
  deleteArtist,
  markArtistAvailabilityVerified,
  setArtistStatus,
  updateArtist,
  updateArtistInternal,
} from "@/server/services/admin/artists";
import { invalidateActiveArtistSlugs } from "@/server/services/public/artist-slugs";
import { CATALOGUE_TAGS } from "@/server/services/public/catalogue";
import { parseInput, runAction } from "./_run";

/**
 * Public pages read the catalogue through `"use cache"` functions tagged by
 * artist and slug. Expiring the tags here means the website shows the change
 * on the next request (read-your-own-writes), not after the cache lifetime.
 */
function expireCatalogue(change: CatalogueChange) {
  updateTag(CATALOGUE_TAGS.artists);
  updateTag(CATALOGUE_TAGS.categories);
  updateTag(CATALOGUE_TAGS.testimonials);
  for (const slug of change.slugs) updateTag(CATALOGUE_TAGS.artist(slug));
  invalidateActiveArtistSlugs();
}

async function mutateCatalogue<T extends CatalogueChange>(name: string, body: () => Promise<T>): Promise<ApiResult<Omit<T, "slugs">>> {
  const result = await runAction(name, body);
  if (!result.ok) return result;
  expireCatalogue(result.data);
  refresh();
  // Slugs are an internal detail for cache expiry; don't send them to the browser.
  const data: Omit<T, "slugs"> & { slugs?: string[] } = { ...result.data };
  delete data.slugs;
  return { ok: true, data };
}

export async function createArtistAction(input: unknown) {
  const actor = await requireActor();
  return mutateCatalogue("createArtist", () => createArtist(actor, parseInput(createArtistSchema, input)));
}

export async function updateArtistAction(input: unknown) {
  const actor = await requireActor();
  return mutateCatalogue("updateArtist", () => updateArtist(actor, parseInput(updateArtistSchema, input)));
}

export async function setArtistStatusAction(input: unknown) {
  const actor = await requireActor();
  return mutateCatalogue("setArtistStatus", () => setArtistStatus(actor, parseInput(setArtistStatusSchema, input)));
}

export async function markArtistAvailabilityVerifiedAction(input: unknown) {
  const actor = await requireActor();
  return mutateCatalogue("markArtistAvailabilityVerified", () =>
    markArtistAvailabilityVerified(actor, parseInput(artistIdSchema, input)),
  );
}

/** Confidential data is never rendered publicly, so no catalogue tags to expire. */
export async function updateArtistInternalAction(input: unknown) {
  const actor = await requireActor();
  const result = await runAction("updateArtistInternal", () => updateArtistInternal(actor, parseInput(artistInternalSchema, input)));
  if (result.ok) refresh();
  return result;
}

export async function deleteArtistAction(input: unknown) {
  const actor = await requireActor();
  return mutateCatalogue("deleteArtist", () => deleteArtist(actor, parseInput(deleteArtistSchema, input)));
}
