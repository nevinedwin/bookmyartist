/**
 * Money helpers. All amounts are integer paise held as `bigint`.
 * Values cross the server/client boundary as decimal strings of paise.
 * Never convert money to `number` for arithmetic.
 */

export type Paise = bigint;

const PAISE_PER_RUPEE = 100n;
const BPS_DENOMINATOR = 10_000n;

/** Parse a user-entered rupee amount ("1,00,000", "2500.5", "₹ 75,000.00") into paise. */
export function rupeesToPaise(input: string): Paise {
  const cleaned = input.replace(/[₹,\s]/g, "").trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new RangeError(`Invalid rupee amount: "${input}"`);
  }
  const negative = cleaned.startsWith("-");
  const [whole = "0", fraction = ""] = cleaned.replace("-", "").split(".");
  const paise = BigInt(whole) * PAISE_PER_RUPEE + BigInt(fraction.padEnd(2, "0"));
  return negative ? -paise : paise;
}

/** Whole rupees (integer) to paise. Accepts number only when it is a safe integer. */
export function rupees(amount: number | bigint): Paise {
  if (typeof amount === "number") {
    if (!Number.isSafeInteger(amount)) throw new RangeError(`Use rupeesToPaise for fractional amounts: ${amount}`);
    return BigInt(amount) * PAISE_PER_RUPEE;
  }
  return amount * PAISE_PER_RUPEE;
}

/** Serialise for transport (JSON / props). */
export function paiseToString(paise: Paise): string {
  return paise.toString();
}

/** Parse a transported paise string. */
export function paiseFromString(value: string): Paise {
  if (!/^-?\d+$/.test(value)) throw new RangeError(`Invalid paise value: "${value}"`);
  return BigInt(value);
}

function toPaise(value: Paise | string): Paise {
  return typeof value === "bigint" ? value : paiseFromString(value);
}

const groupFormatter = new Intl.NumberFormat("en-IN");

export interface FormatOptions {
  /** Show paise even when zero (e.g. "₹1,000.00"). Default: only when non-zero. */
  alwaysShowPaise?: boolean;
  /** Compact notation for dashboards: ₹1.2L, ₹3.4Cr. */
  compact?: boolean;
  /** Omit the ₹ symbol. */
  plain?: boolean;
}

/** Format paise as Indian Rupees using Indian digit grouping (₹1,00,000). */
export function formatINR(value: Paise | string, options: FormatOptions = {}): string {
  const paise = toPaise(value);
  const negative = paise < 0n;
  const abs = negative ? -paise : paise;
  const symbol = options.plain ? "" : "₹";

  if (options.compact) {
    return (negative ? "-" : "") + symbol + compactRupees(abs);
  }

  const whole = abs / PAISE_PER_RUPEE;
  const fraction = abs % PAISE_PER_RUPEE;
  const fractionText =
    fraction !== 0n || options.alwaysShowPaise ? "." + fraction.toString().padStart(2, "0") : "";
  return (negative ? "-" : "") + symbol + groupFormatter.format(whole) + fractionText;
}

function compactRupees(absPaise: Paise): string {
  const CRORE = 10_000_000n * PAISE_PER_RUPEE;
  const LAKH = 100_000n * PAISE_PER_RUPEE;
  const THOUSAND = 1_000n * PAISE_PER_RUPEE;
  const scaled = (unit: Paise, suffix: string) => {
    // One decimal place, rounded half-up, computed in integers.
    const tenths = (absPaise * 10n + unit / 2n) / unit;
    const whole = tenths / 10n;
    const decimal = tenths % 10n;
    return `${groupFormatter.format(whole)}${decimal === 0n ? "" : "." + decimal}${suffix}`;
  };
  if (absPaise >= CRORE) return scaled(CRORE, "Cr");
  if (absPaise >= LAKH) return scaled(LAKH, "L");
  if (absPaise >= THOUSAND) return scaled(THOUSAND, "K");
  return groupFormatter.format(absPaise / PAISE_PER_RUPEE);
}

/**
 * Apply a basis-point rate to an amount, rounding half away from zero to the
 * nearest paisa. 1800 bps = 18%.
 */
export function applyBps(amount: Paise, bps: number | bigint): Paise {
  const rate = BigInt(bps);
  const product = amount * rate;
  const half = BPS_DENOMINATOR / 2n;
  return product >= 0n ? (product + half) / BPS_DENOMINATOR : -((-product + half) / BPS_DENOMINATOR);
}

export function sumPaise(values: Iterable<Paise>): Paise {
  let total = 0n;
  for (const v of values) total += v;
  return total;
}

export function maxPaise(a: Paise, b: Paise): Paise {
  return a > b ? a : b;
}

export function minPaise(a: Paise, b: Paise): Paise {
  return a < b ? a : b;
}

/** Margin as basis points of revenue (0 when revenue is 0). Integer, truncated. */
export function marginBps(margin: Paise, revenue: Paise): number {
  if (revenue === 0n) return 0;
  return Number((margin * BPS_DENOMINATOR) / revenue);
}

/** Basis points → display percentage, e.g. 2050 → "20.5%". */
export function formatBps(bps: number): string {
  const whole = Math.trunc(bps / 100);
  const rest = Math.abs(bps % 100);
  const decimals = rest === 0 ? "" : "." + String(rest).padStart(2, "0").replace(/0$/, "");
  return `${whole}${decimals}%`;
}

/** Paise string → rupees for pre-filling an amount input ("15000050" → "150000.50", "" → ""). */
export function paiseToRupeeInput(value: string | null | undefined): string {
  if (!value) return "";
  const paise = paiseFromString(value);
  const whole = paise / PAISE_PER_RUPEE;
  const fraction = paise % PAISE_PER_RUPEE;
  return fraction === 0n ? whole.toString() : `${whole}.${(fraction < 0n ? -fraction : fraction).toString().padStart(2, "0")}`;
}
