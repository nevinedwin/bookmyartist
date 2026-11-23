import { describe, expect, it } from "vitest";
import { applyBps, formatBps, formatINR, marginBps, paiseFromString, rupees, rupeesToPaise, sumPaise } from "@/lib/money";

describe("rupeesToPaise", () => {
  it.each([
    ["1,00,000", 10_000_000n],
    ["2500.5", 250_050n],
    ["₹ 75,000.00", 7_500_000n],
    ["0.01", 1n],
    ["-120", -12_000n],
  ])("parses %s", (input, expected) => {
    expect(rupeesToPaise(input)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "1..2", "1e5"])("rejects %s", (input) => {
    expect(() => rupeesToPaise(input)).toThrow(RangeError);
  });
});

describe("rupees", () => {
  it("converts whole rupees", () => expect(rupees(1_00_000)).toBe(10_000_000n));
  it("refuses fractional numbers (no float money)", () => expect(() => rupees(10.5)).toThrow());
  it("handles amounts beyond Int32 paise", () => expect(rupees(5_00_00_000)).toBe(5_000_000_000n));
});

describe("formatINR", () => {
  it("uses Indian digit grouping", () => {
    expect(formatINR(10_000_000n)).toBe("₹1,00,000");
    expect(formatINR(1_234_567_890n)).toBe("₹1,23,45,678.90");
  });
  it("shows paise only when non-zero unless forced", () => {
    expect(formatINR(150n)).toBe("₹1.50");
    expect(formatINR(100n, { alwaysShowPaise: true })).toBe("₹1.00");
  });
  it("formats negatives and transported strings", () => {
    expect(formatINR("-500000")).toBe("-₹5,000");
  });
  it("formats compact lakh / crore values", () => {
    expect(formatINR(rupees(250_000), { compact: true })).toBe("₹2.5L");
    expect(formatINR(rupees(12_000_000), { compact: true })).toBe("₹1.2Cr");
    expect(formatINR(rupees(40_000), { compact: true })).toBe("₹40K");
    expect(formatINR(rupees(999), { compact: true })).toBe("₹999");
  });
});

describe("applyBps", () => {
  it("computes 18% exactly", () => expect(applyBps(rupees(1_00_000), 1800)).toBe(rupees(18_000)));
  it("rounds half away from zero to the paisa", () => {
    expect(applyBps(5n, 1000)).toBe(1n); // 0.5 paise → 1
    expect(applyBps(4n, 1000)).toBe(0n); // 0.4 paise → 0
    expect(applyBps(-5n, 1000)).toBe(-1n);
  });
});

describe("helpers", () => {
  it("sums bigint paise", () => expect(sumPaise([1n, 2n, 3n])).toBe(6n));
  it("computes margin in bps (₹30,000 of ₹1,00,000 = 30%)", () => expect(marginBps(rupees(30_000), rupees(1_00_000))).toBe(3000));
  it("handles zero revenue", () => expect(marginBps(1n, 0n)).toBe(0));
  it("formats bps", () => {
    expect(formatBps(2000)).toBe("20%");
    expect(formatBps(2050)).toBe("20.5%");
    expect(formatBps(1875)).toBe("18.75%");
  });
  it("rejects malformed transported values", () => expect(() => paiseFromString("12.5")).toThrow());
});
