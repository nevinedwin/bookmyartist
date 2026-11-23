import "server-only";
import { businessYear } from "@/lib/time";
import type { Tx } from "@/server/db";
import { formatReference, sequenceKey, type ReferenceKind } from "@/server/domain/reference";

/**
 * Allocate the next human-readable reference inside the caller's transaction.
 * The upsert row-locks the counter until commit, so numbers are unique and
 * gap-free (a rolled-back transaction also rolls back its increment).
 */
export async function nextReference(tx: Tx, kind: ReferenceKind, now: Date = new Date()): Promise<string> {
  const year = businessYear(now);
  const key = sequenceKey(kind, year);
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "DocumentSequence" ("key", "value") VALUES (${key}, 1)
    ON CONFLICT ("key") DO UPDATE SET "value" = "DocumentSequence"."value" + 1
    RETURNING "value"`;
  const value = rows[0]?.value;
  if (!value) throw new Error(`Failed to allocate sequence ${key}`);
  return formatReference(kind, year, value);
}
