import { formatINR } from "@/lib/money";

/** "₹1L – ₹3L", "Up to ₹50K", "From ₹5L" or null when no budget was given. */
export function formatBudget(min: string | null, max: string | null): string | null {
  // A zero minimum means "no lower bound" (the public form's "Under ₹50K" range).
  if (min === "0") min = null;
  if (min && max) return `${formatINR(min, { compact: true })} – ${formatINR(max, { compact: true })}`;
  if (max) return `Up to ${formatINR(max, { compact: true })}`;
  if (min) return `From ${formatINR(min, { compact: true })}`;
  return null;
}
