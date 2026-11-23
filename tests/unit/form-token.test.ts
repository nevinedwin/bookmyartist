import { describe, expect, it } from "vitest";
import { FORM_MAX_AGE_MS, FORM_MIN_FILL_MS, issueFormToken, verifyFormToken } from "@/server/security/form-token";

describe("form token", () => {
  const issuedAt = 1_800_000_000_000;

  it("accepts a token used after the minimum fill time", () => {
    expect(verifyFormToken(issueFormToken(issuedAt), issuedAt + FORM_MIN_FILL_MS + 1)).toEqual({ ok: true });
  });

  it("rejects bot-fast submissions", () => {
    expect(verifyFormToken(issueFormToken(issuedAt), issuedAt + 500)).toEqual({ ok: false, reason: "too_fast" });
  });

  it("rejects expired tokens", () => {
    expect(verifyFormToken(issueFormToken(issuedAt), issuedAt + FORM_MAX_AGE_MS + 1)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects forged or malformed tokens", () => {
    const [ts] = issueFormToken(issuedAt).split(".");
    expect(verifyFormToken(`${ts}.forged`, issuedAt + 10_000).ok).toBe(false);
    expect(verifyFormToken(`${Number(ts) - 60_000}.${issueFormToken(issuedAt).split(".")[1]}`, issuedAt + 10_000).ok).toBe(false);
    expect(verifyFormToken("garbage", issuedAt).ok).toBe(false);
  });
});
