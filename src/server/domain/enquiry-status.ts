import type { EnquiryStatus } from "@/generated/prisma/enums";

/** Statuses in pipeline order (used for Kanban columns). */
export const ENQUIRY_PIPELINE: readonly EnquiryStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "CONFIRMED",
  "LOST",
  "CANCELLED",
];

export const CLOSED_ENQUIRY_STATUSES: readonly EnquiryStatus[] = ["CONFIRMED", "LOST", "CANCELLED"];

export function isClosedEnquiry(status: EnquiryStatus): boolean {
  return CLOSED_ENQUIRY_STATUSES.includes(status);
}

/**
 * Allowed manual transitions. CONFIRMED is reached only by converting the
 * enquiry to a booking (see services/admin/enquiries), never by a status edit.
 * Re-opening a closed enquiry requires the `enquiry:reopen` permission.
 */
const TRANSITIONS: Record<EnquiryStatus, readonly EnquiryStatus[]> = {
  NEW: ["CONTACTED", "QUALIFIED", "LOST", "CANCELLED"],
  CONTACTED: ["NEW", "QUALIFIED", "QUOTATION_SENT", "LOST", "CANCELLED"],
  QUALIFIED: ["CONTACTED", "QUOTATION_SENT", "NEGOTIATION", "LOST", "CANCELLED"],
  QUOTATION_SENT: ["QUALIFIED", "NEGOTIATION", "LOST", "CANCELLED"],
  NEGOTIATION: ["QUOTATION_SENT", "LOST", "CANCELLED"],
  CONFIRMED: [],
  LOST: ["CONTACTED", "QUALIFIED"],
  CANCELLED: ["CONTACTED", "QUALIFIED"],
};

export type TransitionCheck =
  | { ok: true; requiresReopenPermission: boolean; requiresLostReason: boolean }
  | { ok: false; reason: string };

export function checkEnquiryTransition(from: EnquiryStatus, to: EnquiryStatus): TransitionCheck {
  if (from === to) return { ok: false, reason: "The enquiry is already in this status." };
  if (to === "CONFIRMED") {
    return { ok: false, reason: "Convert the enquiry to a booking to confirm it." };
  }
  if (!TRANSITIONS[from].includes(to)) {
    return { ok: false, reason: `Cannot move an enquiry from ${from} to ${to}.` };
  }
  return {
    ok: true,
    requiresReopenPermission: isClosedEnquiry(from),
    requiresLostReason: to === "LOST",
  };
}

export function allowedEnquiryTransitions(from: EnquiryStatus): readonly EnquiryStatus[] {
  return TRANSITIONS[from];
}
