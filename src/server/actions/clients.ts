"use server";

import { refresh } from "next/cache";
import type { ApiResult } from "@/lib/api";
import {
  clientSearchSchema,
  createClientSchema,
  enquiryIdSchema,
  linkEnquiryClientSchema,
  setClientArchivedSchema,
  updateClientSchema,
} from "@/lib/validation/clients";
import { requireActor } from "@/server/auth/dal";
import {
  createClient,
  createClientFromEnquiry,
  linkEnquiryClient,
  searchClients,
  setClientArchived,
  updateClient,
} from "@/server/services/admin/clients";
import { parseInput, runAction } from "./_run";

async function mutate<T>(name: string, body: () => Promise<T>): Promise<ApiResult<T>> {
  const result = await runAction(name, body);
  if (result.ok) refresh();
  return result;
}

export async function createClientAction(input: unknown) {
  const actor = await requireActor();
  return mutate("createClient", () => createClient(actor, parseInput(createClientSchema, input)));
}

export async function updateClientAction(input: unknown) {
  const actor = await requireActor();
  return mutate("updateClient", () => updateClient(actor, parseInput(updateClientSchema, input)));
}

export async function setClientArchivedAction(input: unknown) {
  const actor = await requireActor();
  return mutate("setClientArchived", () => setClientArchived(actor, parseInput(setClientArchivedSchema, input)));
}

/** Read-only typeahead; no refresh needed. */
export async function searchClientsAction(input: unknown) {
  const actor = await requireActor();
  return runAction("searchClients", () => searchClients(actor, parseInput(clientSearchSchema, input).q));
}

export async function linkEnquiryClientAction(input: unknown) {
  const actor = await requireActor();
  return mutate("linkEnquiryClient", () => linkEnquiryClient(actor, parseInput(linkEnquiryClientSchema, input)));
}

export async function createClientFromEnquiryAction(input: unknown) {
  const actor = await requireActor();
  return mutate("createClientFromEnquiry", () => createClientFromEnquiry(actor, parseInput(enquiryIdSchema, input)));
}
