import { describe, expect, it } from "vitest";
import { nextAvailableSlug, slugify } from "@/lib/slug";
import { optionalPercentBps, optionalRupees, tagList } from "@/lib/validation/common";
import { artistProfileSchema } from "@/lib/validation/artists";
import { allowedTaskTransitions, canTransitionTask, dueWindow, taskDueState } from "@/server/domain/task";

describe("slugify", () => {
  it("makes readable ASCII slugs", () => {
    expect(slugify("Rhea & The Strings")).toBe("rhea-and-the-strings");
    expect(slugify("  DJ Zoë — Live!! ")).toBe("dj-zoe-live");
    expect(slugify("राग")).toBe("");
    expect(slugify("a".repeat(100))).toHaveLength(80);
  });
  it("appends the first free numeric suffix", () => {
    expect(nextAvailableSlug("dj", new Set())).toBe("dj");
    expect(nextAvailableSlug("dj", new Set(["dj", "dj-2"]))).toBe("dj-3");
  });
});

describe("form money and lists", () => {
  it("parses rupees to paise strings without floating point", () => {
    expect(optionalRupees().parse("1,50,000")).toBe("15000000");
    expect(optionalRupees().parse("0.10")).toBe("10");
    expect(optionalRupees().parse("")).toBeNull();
    expect(optionalRupees().safeParse("-5").success).toBe(false);
    expect(optionalRupees().safeParse("abc").success).toBe(false);
  });
  it("parses percentages to basis points", () => {
    expect(optionalPercentBps().parse("20")).toBe(2000);
    expect(optionalPercentBps().parse("12.5%")).toBe(1250);
    expect(optionalPercentBps().parse("0.05")).toBe(5);
    expect(optionalPercentBps().safeParse("100.01").success).toBe(false);
    expect(optionalPercentBps().safeParse("1.234").success).toBe(false);
  });
  it("de-duplicates comma lists case-insensitively", () => {
    expect(tagList(5).parse("Hindi, english , HINDI,,")).toEqual(["Hindi", "english"]);
    expect(tagList(1).safeParse("a, b").success).toBe(false);
  });
});

describe("artist profile rules", () => {
  const base = {
    stageName: "Test",
    categoryId: "00000000-0000-4000-8000-000000000000",
    shortBio: "x".repeat(20),
    biography: "y".repeat(50),
    baseCity: "Goa",
  };
  it("accepts only allowed image hosts", () => {
    expect(artistProfileSchema.safeParse({ ...base, profileImageUrl: "https://res.cloudinary.com/demo/a.jpg" }).success).toBe(true);
    expect(artistProfileSchema.safeParse({ ...base, profileImageUrl: "https://evil.example/a.jpg" }).success).toBe(false);
    expect(artistProfileSchema.safeParse({ ...base, profileImageUrl: "http://res.cloudinary.com/a.jpg" }).success).toBe(false);
  });
  it("needs a price to show pricing and a contact to show contacts", () => {
    expect(artistProfileSchema.safeParse({ ...base, publicPriceVisible: true }).success).toBe(false);
    expect(artistProfileSchema.safeParse({ ...base, publicPriceVisible: true, publicPriceFrom: "75,000" }).success).toBe(true);
    expect(artistProfileSchema.safeParse({ ...base, publicContactApproved: true }).success).toBe(false);
  });
  it("checks duration order", () => {
    expect(artistProfileSchema.safeParse({ ...base, minDurationMinutes: "90", maxDurationMinutes: "60" }).success).toBe(false);
  });
});

describe("task rules", () => {
  const now = new Date("2026-11-23T06:30:00Z"); // 12:00 IST
  it("classifies due dates in the business timezone", () => {
    expect(taskDueState(new Date("2026-11-23T05:00:00Z"), "OPEN", now)).toBe("overdue");
    expect(taskDueState(new Date("2026-11-23T18:00:00Z"), "IN_PROGRESS", now)).toBe("today"); // 23:30 IST
    expect(taskDueState(new Date("2026-11-23T18:31:00Z"), "OPEN", now)).toBe("upcoming"); // 00:01 IST next day
    expect(taskDueState(new Date("2026-11-01T00:00:00Z"), "DONE", now)).toBe("none");
    expect(taskDueState(null, "OPEN", now)).toBe("none");
  });
  it("only re-opens finished tasks", () => {
    expect(allowedTaskTransitions("DONE")).toEqual(["OPEN"]);
    expect(canTransitionTask("OPEN", "DONE")).toBe(true);
    expect(canTransitionTask("CANCELLED", "DONE")).toBe(false);
  });
  it("builds due windows", () => {
    expect(dueWindow("overdue", now)).toEqual({ lt: now });
    expect(dueWindow("today", now).lte?.toISOString()).toBe("2026-11-23T18:29:59.999Z");
    expect(dueWindow("week", now).lte?.toISOString()).toBe("2026-11-29T18:29:59.999Z");
  });
});
