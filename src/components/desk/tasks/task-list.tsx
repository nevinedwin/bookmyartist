"use client";

import { AlarmClock, Circle, CircleCheck, CircleDot, Loader2, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { PriorityLabel, TaskStatusBadge } from "@/components/desk/badges";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { TaskStatus } from "@/generated/prisma/enums";
import { TASK_STATUS_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { setTaskStatusAction } from "@/server/actions/tasks";
import { allowedTaskTransitions, isOpenTask } from "@/server/domain/task";
import type { TaskAssignee, TaskItem } from "@/server/services/admin/tasks";
import { useActionRunner } from "../enquiries/use-action";
import { TaskDialog } from "./task-dialog";

const DUE_STYLES = {
  overdue: "font-medium text-rose-700",
  today: "font-medium text-orange-700",
  upcoming: "text-muted-foreground",
  none: "text-muted-foreground",
} as const;

export function TaskList({
  tasks,
  canWrite,
  assignees,
  currentUserId,
  showEnquiry = true,
}: {
  tasks: TaskItem[];
  canWrite: boolean;
  assignees: TaskAssignee[];
  currentUserId: string;
  showEnquiry?: boolean;
}) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {tasks.map((t) => (
        <TaskRow key={`${t.id}:${t.status}`} task={t} canWrite={canWrite} assignees={assignees} currentUserId={currentUserId} showEnquiry={showEnquiry} />
      ))}
    </ul>
  );
}

function TaskRow({
  task: t,
  canWrite,
  assignees,
  currentUserId,
  showEnquiry,
}: {
  task: TaskItem;
  canWrite: boolean;
  assignees: TaskAssignee[];
  currentUserId: string;
  showEnquiry: boolean;
}) {
  const { pending, run } = useActionRunner();
  const open = isOpenTask(t.status);
  const move = (to: TaskStatus) =>
    run(() => setTaskStatusAction({ taskId: t.id, from: t.status, to }), to === "DONE" ? "Task done" : `Moved to ${TASK_STATUS_LABELS[to].toLowerCase()}`);
  const Icon = pending ? Loader2 : t.status === "DONE" ? CircleCheck : t.status === "IN_PROGRESS" ? CircleDot : Circle;

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      {canWrite && t.status !== "CANCELLED" ? (
        <button
          type="button"
          className="mt-0.5 rounded-full text-muted-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
          aria-label={open ? `Mark “${t.title}” done` : `Re-open “${t.title}”`}
          disabled={pending}
          onClick={() => move(open ? "DONE" : "OPEN")}
        >
          <Icon className={cn("size-5", pending && "animate-spin", t.status === "DONE" && "text-emerald-600")} aria-hidden="true" />
        </button>
      ) : (
        <Icon className={cn("mt-0.5 size-5 text-muted-foreground", t.status === "DONE" && "text-emerald-600")} aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", !open && "text-muted-foreground line-through decoration-muted-foreground/50")}>{t.title}</p>
        {t.description ? <p className="mt-0.5 line-clamp-2 text-xs whitespace-pre-wrap text-muted-foreground">{t.description}</p> : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {t.status !== "OPEN" ? <TaskStatusBadge status={t.status} /> : null}
          <PriorityLabel priority={t.priority} />
          {t.dueAt ? (
            <span className={cn("inline-flex items-center gap-1", DUE_STYLES[t.dueState])}>
              {t.dueState === "overdue" || t.dueState === "today" ? <AlarmClock className="size-3.5" aria-hidden="true" /> : null}
              {t.dueState === "overdue" ? "Overdue · " : t.dueState === "today" ? "Today · " : "Due "}
              {formatDateTime(t.dueAt)}
            </span>
          ) : null}
          <span className="text-muted-foreground">{t.assignee ? (t.assignee.id === currentUserId ? "You" : t.assignee.name) : "Unassigned"}</span>
          {showEnquiry && t.enquiry ? (
            <Link href={`/admin/enquiries/${t.enquiry.id}`} className="text-primary hover:underline">
              {t.enquiry.reference} · {t.enquiry.contactName}
            </Link>
          ) : null}
          {t.completedAt && t.status === "DONE" ? <span className="text-muted-foreground">Done {formatDateTime(t.completedAt)}</span> : null}
        </div>
      </div>
      {canWrite ? (
        <div className="flex shrink-0 items-center">
          <TaskDialog task={t} assignees={assignees} currentUserId={currentUserId} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`More actions for “${t.title}”`} disabled={pending}>
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {allowedTaskTransitions(t.status).map((to) => (
                <DropdownMenuItem key={to} onSelect={() => void move(to)}>
                  {to === "OPEN" && !open ? "Re-open" : to === "OPEN" ? "Move back to to do" : to === "CANCELLED" ? "Cancel task" : TASK_STATUS_LABELS[to]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </li>
  );
}
