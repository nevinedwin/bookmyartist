import { z } from "zod";
import { EventType } from "@/generated/prisma/enums";
import { BUDGET_RANGES, type BudgetRangeId } from "@/lib/labels";

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const text = (max: number) => z.preprocess(first, z.string().trim().max(max).optional().catch(undefined));

/** Lenient parser for /artists query params: invalid values are ignored, never errors. */
export const artistSearchParamsSchema = z.object({
  q: text(80),
  category: z.preprocess(first, z.string().regex(/^[a-z0-9-]{1,80}$/).optional().catch(undefined)),
  city: text(80),
  event: z.preprocess(first, z.enum(EventType).optional().catch(undefined)),
  type: text(120),
  budget: z.preprocess(
    first,
    z
      .enum(BUDGET_RANGES.map((b) => b.id) as [BudgetRangeId, ...BudgetRangeId[]])
      .optional()
      .catch(undefined),
  ),
  available: z.preprocess(first, z.literal("1").optional().catch(undefined)),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(500).optional().catch(undefined)),
});
