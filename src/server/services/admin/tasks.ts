import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Priority, TaskStatus } from "@/generated/prisma/enums";
import { TASK_STATUS_LABELS } from "@/lib/labels";
import { businessDayEnd, businessLocalToUtc } from "@/lib/time";
import { TASK_PAGE_SIZE, type CreateTaskInput, type TaskListParams, type UpdateTaskInput } from "@/lib/validation/tasks";
import { type Actor, authorize, can } from "@/server/auth/actor";
import { db, type Tx } from "@/server/db";
import { OPEN_TASK_STATUSES, type TaskDueState, canTransitionTask, dueWindow, taskDueState } from "@/server/domain/task";
import { ServiceError, conflictError, notFoundError } from "../errors";

/*
 * Team to-dos, optionally tied to an enquiry. Like enquiries, everyone with
 * `task:read` sees every task ("mine" is a filter). `task:write` creates,
 * edits, reassigns and completes any task.
 */

const PRIORITY_RANK: Record<Priority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  enquiry: { select: { id: true, reference: true, contactName: true } },
} satisfies Prisma.TaskSelect;

type TaskRow = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueAt: Date | null;
  dueState: TaskDueState;
  completedAt: Date | null;
  createdAt: Date;
  assignee: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  /** Hidden from people without `enquiry:read`. */
  enquiry: { id: string; reference: string; contactName: string } | null;
}

function toItem(row: TaskRow, actor: Actor, now: Date): TaskItem {
  return {
    ...row,
    dueState: taskDueState(row.dueAt, row.status, now),
    enquiry: can(actor, "enquiry:read") ? row.enquiry : null,
  };
}

/** Overdue first, then by due date, then most urgent. Finished tasks sink to the bottom. */
function sortTasks(a: TaskItem, b: TaskItem): number {
  const openA = OPEN_TASK_STATUSES.includes(a.status) ? 0 : 1;
  const openB = OPEN_TASK_STATUSES.includes(b.status) ? 0 : 1;
  if (openA !== openB) return openA - openB;
  if (openA === 1) return (b.completedAt ?? b.createdAt).getTime() - (a.completedAt ?? a.createdAt).getTime();
  const dueA = a.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const dueB = b.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (dueA !== dueB) return dueA - dueB;
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.createdAt.getTime() - a.createdAt.getTime();
}

function listWhere(actor: Actor, params: TaskListParams, now: Date): Prisma.TaskWhereInput {
  const and: Prisma.TaskWhereInput[] = [];
  const state = params.state ?? "open";
  if (state === "open") and.push({ status: { in: [...OPEN_TASK_STATUSES] } });
  if (state === "done") and.push({ status: { notIn: [...OPEN_TASK_STATUSES] } });

  if (params.assignee === "me") and.push({ assigneeId: actor.userId });
  else if (params.assignee === "unassigned") and.push({ assigneeId: null });
  else if (params.assignee) and.push({ assigneeId: params.assignee });

  if (params.priority) and.push({ priority: params.priority });
  if (params.due === "none") and.push({ dueAt: null });
  else if (params.due) and.push({ dueAt: dueWindow(params.due, now) });

  if (params.q) {
    and.push({
      OR: [
        { title: { contains: params.q, mode: "insensitive" } },
        { description: { contains: params.q, mode: "insensitive" } },
        ...(can(actor, "enquiry:read") ? [{ enquiry: { reference: { contains: params.q, mode: "insensitive" as const } } }] : []),
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

export interface TaskPage {
  items: TaskItem[];
  total: number;
  page: number;
  pageCount: number;
}

export async function listTasks(actor: Actor, params: TaskListParams, now = new Date()): Promise<TaskPage> {
  authorize(actor, "task:read");
  const where = listWhere(actor, params, now);
  const page = params.page ?? 1;
  const [total, rows] = await Promise.all([
    db.task.count({ where }),
    db.task.findMany({
      where,
      select: taskSelect,
      // Database order approximates sortTasks so pagination is stable; each page is then sorted precisely.
      orderBy: [{ completedAt: { sort: "desc", nulls: "first" } }, { dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      skip: (page - 1) * TASK_PAGE_SIZE,
      take: TASK_PAGE_SIZE,
    }),
  ]);
  return {
    items: rows.map((r) => toItem(r, actor, now)).sort(sortTasks),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / TASK_PAGE_SIZE)),
  };
}

export async function listEnquiryTasks(actor: Actor, enquiryId: string, now = new Date()): Promise<TaskItem[]> {
  authorize(actor, "task:read");
  authorize(actor, "enquiry:read");
  const rows = await db.task.findMany({ where: { enquiryId }, select: taskSelect, orderBy: { createdAt: "desc" }, take: 100 });
  return rows.map((r) => toItem(r, actor, now)).sort(sortTasks);
}

export interface TaskSummary {
  mineOverdue: number;
  mineDueToday: number;
  mineOpen: number;
  unassignedOpen: number;
  upcomingMine: TaskItem[];
}

/** Dashboard numbers, all live counts. */
export async function getTaskSummary(actor: Actor, now = new Date()): Promise<TaskSummary> {
  authorize(actor, "task:read");
  const open = { status: { in: [...OPEN_TASK_STATUSES] } };
  const mine = { ...open, assigneeId: actor.userId };
  const [mineOverdue, mineDueToday, mineOpen, unassignedOpen, upcoming] = await Promise.all([
    db.task.count({ where: { ...mine, dueAt: { lt: now } } }),
    db.task.count({ where: { ...mine, dueAt: { gte: now, lte: businessDayEnd(now) } } }),
    db.task.count({ where: mine }),
    db.task.count({ where: { ...open, assigneeId: null } }),
    db.task.findMany({ where: mine, select: taskSelect, orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }], take: 6 }),
  ]);
  return { mineOverdue, mineDueToday, mineOpen, unassignedOpen, upcomingMine: upcoming.map((r) => toItem(r, actor, now)) };
}

export interface TaskAssignee {
  id: string;
  name: string;
}

export async function listTaskAssignees(actor: Actor): Promise<TaskAssignee[]> {
  authorize(actor, "task:read");
  return db.user.findMany({
    where: { status: "ACTIVE", deletedAt: null, artistId: null, role: { permissions: { some: { permission: { key: "task:write" } } } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ───────────────────────────── Writes ─────────────────────────────

async function assertAssignee(tx: Tx, assigneeId: string | null) {
  if (!assigneeId) return null;
  const user = await tx.user.findFirst({
    where: {
      id: assigneeId,
      status: "ACTIVE",
      deletedAt: null,
      artistId: null,
      role: { permissions: { some: { permission: { key: "task:write" } } } },
    },
    select: { id: true, name: true },
  });
  if (!user) throw new ServiceError("invalid_assignee", "That person can't be given tasks.", { assigneeId: ["Choose an active team member."] });
  return user;
}

async function notifyAssignee(tx: Tx, actor: Actor, assigneeId: string | null, task: { id: string; title: string; enquiryId: string | null }) {
  if (!assigneeId || assigneeId === actor.userId) return;
  await tx.notification.create({
    data: {
      recipientId: assigneeId,
      type: "task.assigned",
      title: `${actor.name} gave you a task`,
      body: task.title,
      href: task.enquiryId ? `/admin/enquiries/${task.enquiryId}` : `/admin/tasks?assignee=me`,
    },
  });
}

const dueFromLocal = (v: string | null) => (v ? businessLocalToUtc(v) : null);

export async function createTask(actor: Actor, input: CreateTaskInput): Promise<{ id: string }> {
  authorize(actor, "task:write");
  if (input.enquiryId) authorize(actor, "enquiry:read");
  return db.$transaction(async (tx) => {
    await assertAssignee(tx, input.assigneeId);
    if (input.enquiryId && !(await tx.enquiry.count({ where: { id: input.enquiryId } }))) throw notFoundError("Enquiry");
    const task = await tx.task.create({
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueAt: dueFromLocal(input.dueAt),
        assigneeId: input.assigneeId,
        enquiryId: input.enquiryId,
        createdById: actor.userId,
      },
      select: { id: true, title: true, enquiryId: true },
    });
    await notifyAssignee(tx, actor, input.assigneeId, task);
    return { id: task.id };
  });
}

export async function updateTask(actor: Actor, input: UpdateTaskInput): Promise<void> {
  authorize(actor, "task:write");
  await db.$transaction(async (tx) => {
    const current = await tx.task.findUnique({ where: { id: input.taskId }, select: { id: true, assigneeId: true, enquiryId: true, dueAt: true } });
    if (!current) throw notFoundError("Task");
    if (input.assigneeId !== current.assigneeId) await assertAssignee(tx, input.assigneeId);
    const dueAt = dueFromLocal(input.dueAt);
    const task = await tx.task.update({
      where: { id: current.id },
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueAt,
        assigneeId: input.assigneeId,
        // A new due date deserves a fresh reminder.
        ...(dueAt?.getTime() !== current.dueAt?.getTime() ? { reminderSentAt: null } : {}),
      },
      select: { id: true, title: true, enquiryId: true },
    });
    if (input.assigneeId !== current.assigneeId) await notifyAssignee(tx, actor, input.assigneeId, task);
  });
}

/** Conditional on the status the user saw, so two people can't silently overwrite each other. */
export async function setTaskStatus(actor: Actor, input: { taskId: string; from: TaskStatus; to: TaskStatus }, now = new Date()): Promise<void> {
  authorize(actor, "task:write");
  if (!canTransitionTask(input.from, input.to)) {
    throw new ServiceError("invalid_transition", `A task that is ${TASK_STATUS_LABELS[input.from].toLowerCase()} can't move to ${TASK_STATUS_LABELS[input.to].toLowerCase()}.`);
  }
  const { count } = await db.task.updateMany({
    where: { id: input.taskId, status: input.from },
    data: { status: input.to, completedAt: input.to === "DONE" ? now : null },
  });
  if (count === 0) {
    if (!(await db.task.count({ where: { id: input.taskId } }))) throw notFoundError("Task");
    throw conflictError("Someone else updated this task. Refresh to see the latest.");
  }
}
