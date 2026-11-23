import { describe, expect, it } from "vitest";
import { formatReference, isReference, sequenceKey } from "@/server/domain/reference";

describe("references", () => {
  it("formats per-year, zero-padded references", () => {
    expect(formatReference("enquiry", 2026, 123)).toBe("ENQ-2026-000123");
    expect(formatReference("invoice", 2027, 1)).toBe("INV-2027-000001");
    expect(sequenceKey("booking", 2026)).toBe("BKG-2026");
  });
  it("rejects invalid sequence values", () => {
    expect(() => formatReference("enquiry", 2026, 0)).toThrow();
    expect(() => formatReference("enquiry", 2026, 1.5)).toThrow();
  });
  it("recognises references", () => {
    expect(isReference("enq-2026-000123")).toBe(true);
    expect(isReference("ENQ-26-1")).toBe(false);
  });
});
