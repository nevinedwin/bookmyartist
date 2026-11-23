"use server";

import { refresh } from "next/cache";
import type { ApiResult } from "@/lib/api";
import { createTaskSchema, setTaskStatusSchema, updateTaskSchema } from "@/lib/validation/tasks";
import { requireActor } from "@/server/auth/dal";
import { createTask, setTaskStatus, updateTask } from "@/server/services/admin/tasks";
import { parseInput, runAction } from "./_run";

async function mutate<T>(name: string, body: () => Promise<T>): Promise<ApiResult<T>> {
  const result = await runAction(name, body);
  if (result.ok) refresh();
  return result;
}

export async function createTaskAction(input: unknown) {
  const actor = await requireActor();
  return mutate("createTask", () => createTask(actor, parseInput(createTaskSchema, input)));
}

export async function updateTaskAction(input: unknown) {
  const actor = await requireActor();
  return mutate("updateTask", () => updateTask(actor, parseInput(updateTaskSchema, input)));
}

export async function setTaskStatusAction(input: unknown) {
  const actor = await requireActor();
  return mutate("setTaskStatus", () => setTaskStatus(actor, parseInput(setTaskStatusSchema, input)));
}
