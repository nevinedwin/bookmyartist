import "server-only";
import { db } from "@/server/db";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Fixed-window rate limiter backed by Postgres (atomic upsert), so it works
 * across serverless instances without extra infrastructure.
 */
export async function rateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const resetAt = new Date(windowStart.getTime() + windowMs);
  const key = `${scope}:${identifier}:${windowStart.getTime()}`;

  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStart", "expiresAt")
    VALUES (${key}, 1, ${windowStart}, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET "count" = "RateLimitBucket"."count" + 1
    RETURNING "count"`;
  const count = rows[0]?.count ?? limit + 1;

  return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt };
}

/** Housekeeping, called from the cron route. */
export async function purgeExpiredRateLimits(): Promise<number> {
  const { count } = await db.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return count;
}
