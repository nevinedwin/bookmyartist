import { describe, expect, it } from "vitest";
import { allowedEnquiryTransitions, checkEnquiryTransition, ENQUIRY_PIPELINE } from "@/server/domain/enquiry-status";

describe("enquiry status transitions", () => {
  it("allows the normal forward path", () => {
    expect(checkEnquiryTransition("NEW", "CONTACTED").ok).toBe(true);
    expect(checkEnquiryTransition("CONTACTED", "QUALIFIED").ok).toBe(true);
    expect(checkEnquiryTransition("QUALIFIED", "QUOTATION_SENT").ok).toBe(true);
    expect(checkEnquiryTransition("QUOTATION_SENT", "NEGOTIATION").ok).toBe(true);
  });

  it("never allows CONFIRMED by a status change (conversion only)", () => {
    for (const from of ENQUIRY_PIPELINE) {
      const result = checkEnquiryTransition(from, "CONFIRMED");
      expect(result.ok).toBe(false);
    }
  });

  it("requires a reason when marking as lost", () => {
    const result = checkEnquiryTransition("NEGOTIATION", "LOST");
    expect(result).toMatchObject({ ok: true, requiresLostReason: true });
  });

  it("requires the reopen permission to leave a closed state", () => {
    expect(checkEnquiryTransition("LOST", "CONTACTED")).toMatchObject({ ok: true, requiresReopenPermission: true });
    expect(checkEnquiryTransition("NEW", "CONTACTED")).toMatchObject({ ok: true, requiresReopenPermission: false });
  });

  it("rejects no-ops and skipping illegal steps", () => {
    expect(checkEnquiryTransition("NEW", "NEW").ok).toBe(false);
    expect(checkEnquiryTransition("NEW", "NEGOTIATION").ok).toBe(false);
    expect(allowedEnquiryTransitions("CONFIRMED")).toHaveLength(0);
  });
});
