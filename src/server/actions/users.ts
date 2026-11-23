"use server";

import { refresh } from "next/cache";
import type { ApiResult } from "@/lib/api";
import {
  adminUpdateUserSchema,
  createUserSchema,
  deleteUserSchema,
  setUserStatusSchema,
  updateUserRoleSchema,
  userIdSchema,
} from "@/lib/validation/users";
import { requireActor } from "@/server/auth/dal";
import {
  changeUserRole,
  createUser,
  deleteUser,
  resetUserPassword,
  setUserStatus,
  signOutUserEverywhere,
  updateUserDetails,
} from "@/server/services/admin/users";
import { parseInput, requestContext, runAction } from "./_run";

async function mutate<T>(name: string, body: () => Promise<T>): Promise<ApiResult<T>> {
  const result = await runAction(name, body);
  if (result.ok) refresh();
  return result;
}

/** Returns the one-time temporary password to show the admin. It is never stored in plain text. */
export async function createUserAction(input: unknown) {
  const actor = await requireActor();
  return mutate("createUser", async () => {
    const { temporaryPassword } = await createUser(actor, parseInput(createUserSchema, input), await requestContext());
    return { temporaryPassword };
  });
}

export async function changeUserRoleAction(input: unknown) {
  const actor = await requireActor();
  return mutate("changeUserRole", async () => changeUserRole(actor, parseInput(updateUserRoleSchema, input), await requestContext()));
}

export async function setUserStatusAction(input: unknown) {
  const actor = await requireActor();
  return mutate("setUserStatus", async () => setUserStatus(actor, parseInput(setUserStatusSchema, input), await requestContext()));
}

export async function resetUserPasswordAction(input: unknown) {
  const actor = await requireActor();
  return mutate("resetUserPassword", async () => resetUserPassword(actor, parseInput(userIdSchema, input), await requestContext()));
}

export async function signOutUserEverywhereAction(input: unknown) {
  const actor = await requireActor();
  return mutate("signOutUserEverywhere", async () =>
    signOutUserEverywhere(actor, parseInput(userIdSchema, input), await requestContext()),
  );
}

export async function updateUserDetailsAction(input: unknown) {
  const actor = await requireActor();
  return mutate("updateUserDetails", async () => updateUserDetails(actor, parseInput(adminUpdateUserSchema, input), await requestContext()));
}

export async function deleteUserAction(input: unknown) {
  const actor = await requireActor();
  return mutate("deleteUser", async () => deleteUser(actor, parseInput(deleteUserSchema, input), await requestContext()));
}
