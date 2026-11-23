import type { TaskStatus } from "@/generated/prisma/enums";
import { businessDayEnd, businessDayStart } from "@/lib/time";

/** Pure task rules: status transitions and due-date buckets (business timezone). */

export const OPEN_TASK_STATUSES: readonly TaskStatus[] = ["OPEN", "IN_PROGRESS"];

const TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  OPEN: ["IN_PROGRESS", "DONE", "CANCELLED"],
  IN_PROGRESS: ["OPEN", "DONE", "CANCELLED"],
  DONE: ["OPEN"],
  CANCELLED: ["OPEN"],
};

export function allowedTaskTransitions(from: TaskStatus): readonly TaskStatus[] {
  return TRANSITIONS[from];
}

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isOpenTask(status: TaskStatus): boolean {
  return OPEN_TASK_STATUSES.includes(status);
}

export type TaskDueState = "overdue" | "today" | "upcoming" | "none";

/**
 * "overdue" = due before now; "today" = due later today (business timezone).
 * Finished tasks are never overdue.
 */
export function taskDueState(dueAt: Date | null, status: TaskStatus, now: Date): TaskDueState {
  if (!dueAt || !isOpenTask(status)) return "none";
  if (dueAt < now) return "overdue";
  if (dueAt <= businessDayEnd(now)) return "today";
  return "upcoming";
}

/** Date window for the list filter. `week` = from now to the end of the 7th business day. */
export function dueWindow(filter: "overdue" | "today" | "week", now: Date): { gte?: Date; lt?: Date; lte?: Date } {
  switch (filter) {
    case "overdue":
      return { lt: now };
    case "today":
      return { gte: businessDayStart(now), lte: businessDayEnd(now) };
    case "week":
      return { lte: businessDayEnd(new Date(now.getTime() + 6 * 86_400_000)) };
  }
}
