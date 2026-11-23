"use server";

import { refresh } from "next/cache";
import { alertSettingsSchema } from "@/lib/validation/settings";
import { requireActor } from "@/server/auth/dal";
import { sendTestAlert, updateAlertSettings } from "@/server/services/admin/settings";
import { parseInput, runAction } from "./_run";

export async function updateAlertSettingsAction(input: unknown) {
  const actor = await requireActor();
  const result = await runAction("updateAlertSettings", () => updateAlertSettings(actor, parseInput(alertSettingsSchema, input)));
  if (result.ok) refresh();
  return result;
}

export async function sendTestAlertAction() {
  const actor = await requireActor();
  const result = await runAction("sendTestAlert", () => sendTestAlert(actor));
  refresh();
  return result;
}
