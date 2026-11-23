"use server";

import { refresh } from "next/cache";
import type { ApiResult } from "@/lib/api";
import {
  addNoteSchema,
  assignOwnerSchema,
  changeStatusSchema,
  deleteEnquirySchema,
  logContactSchema,
  setFollowUpSchema,
  setPrioritySchema,
  togglePinSchema,
  updateEnquirySchema,
} from "@/lib/validation/admin-enquiry";
import { requireActor } from "@/server/auth/dal";
import {
  addEnquiryNote,
  assignEnquiryOwner,
  changeEnquiryStatus,
  deleteEnquiry,
  logEnquiryContact,
  setEnquiryFollowUp,
  setEnquiryPriority,
  setNotePinned,
  updateEnquiryDetails,
} from "@/server/services/admin/enquiries";
import { parseInput, runAction } from "./_run";

/*
 * Every action re-reads the session and the service re-checks permissions:
 * the action being reachable from the UI grants nothing.
 */

async function mutate<T>(name: string, body: () => Promise<T>): Promise<ApiResult<T>> {
  const result = await runAction(name, body);
  if (result.ok) refresh();
  return result;
}

export async function changeEnquiryStatusAction(input: unknown) {
  const actor = await requireActor();
  return mutate("changeEnquiryStatus", () => changeEnquiryStatus(actor, parseInput(changeStatusSchema, input)));
}

export async function assignEnquiryOwnerAction(input: unknown) {
  const actor = await requireActor();
  return mutate("assignEnquiryOwner", () => assignEnquiryOwner(actor, parseInput(assignOwnerSchema, input)));
}

export async function setEnquiryPriorityAction(input: unknown) {
  const actor = await requireActor();
  return mutate("setEnquiryPriority", () => setEnquiryPriority(actor, parseInput(setPrioritySchema, input)));
}

export async function setEnquiryFollowUpAction(input: unknown) {
  const actor = await requireActor();
  return mutate("setEnquiryFollowUp", () => setEnquiryFollowUp(actor, parseInput(setFollowUpSchema, input)));
}

export async function addEnquiryNoteAction(input: unknown) {
  const actor = await requireActor();
  return mutate("addEnquiryNote", () => addEnquiryNote(actor, parseInput(addNoteSchema, input)));
}

export async function setNotePinnedAction(input: unknown) {
  const actor = await requireActor();
  return mutate("setNotePinned", async () => {
    await setNotePinned(actor, parseInput(togglePinSchema, input));
  });
}

export async function logEnquiryContactAction(input: unknown) {
  const actor = await requireActor();
  return mutate("logEnquiryContact", () => logEnquiryContact(actor, parseInput(logContactSchema, input)));
}

export async function updateEnquiryDetailsAction(input: unknown) {
  const actor = await requireActor();
  return mutate("updateEnquiryDetails", () => updateEnquiryDetails(actor, parseInput(updateEnquirySchema, input)));
}

/** No refresh: the enquiry is gone, so the client navigates back to the list. */
export async function deleteEnquiryAction(input: unknown) {
  const actor = await requireActor();
  return runAction("deleteEnquiry", () => deleteEnquiry(actor, parseInput(deleteEnquirySchema, input)));
}
