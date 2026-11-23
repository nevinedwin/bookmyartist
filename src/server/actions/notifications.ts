"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireActor } from "@/server/auth/dal";
import { markNotificationsRead } from "@/server/services/admin/notifications";
import { parseInput, runAction } from "./_run";

const markSchema = z.union([z.literal("all"), z.array(z.uuid()).min(1).max(100)]);

export async function markNotificationsReadAction(ids: unknown) {
  const actor = await requireActor();
  const result = await runAction("markNotificationsRead", () => markNotificationsRead(actor, parseInput(markSchema, ids)));
  if (result.ok) refresh();
  return result;
}
