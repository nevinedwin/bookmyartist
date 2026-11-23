/** Reference prefixes for human-readable, per-year document numbers. */
export const REFERENCE_PREFIX = {
  enquiry: "ENQ",
  booking: "BKG",
  quotation: "QT",
  invoice: "INV",
  receipt: "RCP",
  payout: "PAY",
  expense: "EXP",
} as const;

export type ReferenceKind = keyof typeof REFERENCE_PREFIX;

/** Sequence key stored in DocumentSequence, e.g. "ENQ-2026". */
export function sequenceKey(kind: ReferenceKind, year: number): string {
  return `${REFERENCE_PREFIX[kind]}-${year}`;
}

/** ENQ-2026-000123 */
export function formatReference(kind: ReferenceKind, year: number, value: number): string {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`Invalid sequence value ${value}`);
  return `${sequenceKey(kind, year)}-${String(value).padStart(6, "0")}`;
}

const REFERENCE_PATTERN = /^(ENQ|BKG|QT|INV|RCP|PAY|EXP)-\d{4}-\d{6}$/;

export function isReference(value: string): boolean {
  return REFERENCE_PATTERN.test(value.trim().toUpperCase());
}
