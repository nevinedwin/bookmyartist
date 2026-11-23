import { describe, expect, it } from "vitest";
import { artistSearchParamsSchema } from "@/lib/validation/artist-filters";

describe("artist search params", () => {
  it("keeps valid filters", () => {
    expect(artistSearchParamsSchema.parse({ category: "djs", event: "WEDDING", budget: "1l-3l", page: "2", available: "1" })).toMatchObject({
      category: "djs",
      event: "WEDDING",
      budget: "1l-3l",
      page: 2,
      available: "1",
    });
  });

  it("silently drops invalid values instead of erroring", () => {
    const parsed = artistSearchParamsSchema.parse({ category: "DROP TABLE", event: "NOPE", page: "-4", budget: "free" });
    expect(parsed).toEqual({ q: undefined, category: undefined, city: undefined, event: undefined, type: undefined, budget: undefined, available: undefined, page: undefined });
  });

  it("uses the first value of repeated params", () => {
    expect(artistSearchParamsSchema.parse({ q: ["jazz", "rock"] }).q).toBe("jazz");
  });
});
