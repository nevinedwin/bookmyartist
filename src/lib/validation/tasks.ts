import { z } from "zod";
import { Priority, TaskStatus } from "@/generated/prisma/enums";
import { lenient, localDateTime, optionalText, requiredText } from "./common";

export const TASK_PAGE_SIZE = 30;
export const TASK_DUE_FILTERS = ["overdue", "today", "week", "none"] as const;
export const TASK_STATE_FILTERS = ["open", "done", "all"] as const;

export const taskListParamsSchema = z.object({
  q: lenient(z.string().trim().min(1).max(100)),
  /** "me", "unassigned" or a user id. Default (absent) is everyone's. */
  assignee: lenient(z.union([z.literal("me"), z.literal("unassigned"), z.uuid()])),
  state: lenient(z.enum(TASK_STATE_FILTERS)),
  due: lenient(z.enum(TASK_DUE_FILTERS)),
  priority: lenient(z.enum(Priority)),
  page: lenient(z.coerce.number().int().min(1).max(1000)),
});
export type TaskListParams = z.infer<typeof taskListParamsSchema>;

const taskFields = z.object({
  title: requiredText(2, 200, "Describe the task in a few words."),
  description: optionalText(5000),
  priority: z.enum(Priority).default("MEDIUM"),
  /** Business-timezone datetime-local string, or null for no due date. */
  dueAt: localDateTime.nullable().default(null),
  assigneeId: z.uuid().nullable().default(null),
});

export const createTaskSchema = taskFields.extend({ enquiryId: z.uuid().nullable().default(null) });
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = taskFields.extend({ taskId: z.uuid() });
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const setTaskStatusSchema = z.object({ taskId: z.uuid(), from: z.enum(TaskStatus), to: z.enum(TaskStatus) });
