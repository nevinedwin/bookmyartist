"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { type FieldErrors, FormField, fieldAria } from "@/components/desk/form-field";
import { NativeSelect } from "@/components/desk/native-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Priority } from "@/generated/prisma/enums";
import { PRIORITY_LABELS } from "@/lib/labels";
import { utcToBusinessLocal } from "@/lib/time";
import { createTaskAction, updateTaskAction } from "@/server/actions/tasks";
import type { TaskAssignee, TaskItem } from "@/server/services/admin/tasks";
import { useActionRunner } from "../enquiries/use-action";

interface Values {
  title: string;
  description: string;
  priority: Priority;
  dueAt: string;
  assigneeId: string;
}

/** Create (optionally on an enquiry) or edit a task. Due times are entered in IST. */
export function TaskDialog({
  assignees,
  currentUserId,
  enquiryId,
  task,
  trigger,
}: {
  assignees: TaskAssignee[];
  currentUserId: string;
  enquiryId?: string;
  task?: TaskItem;
  trigger?: "button" | "icon" | "small";
}) {
  const initial = (): Values => ({
    title: task?.title ?? "",
    description: task?.description ?? "",
    priority: task?.priority ?? "MEDIUM",
    dueAt: task?.dueAt ? utcToBusinessLocal(task.dueAt) : "",
    assigneeId: task ? (task.assignee?.id ?? "") : assignees.some((a) => a.id === currentUserId) ? currentUserId : "",
  });
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Values>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { pending, run } = useActionRunner();
  const err = (k: string) => errors[k]?.[0];
  const field = (k: keyof Values) => ({
    id: `task-${k}`,
    value: v[k],
    onChange: (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value })),
    ...fieldAria(`task-${k}`, err(k)),
  });
  // Keep a departed assignee selectable so editing doesn't silently unassign.
  const options = task?.assignee && !assignees.some((a) => a.id === task.assignee!.id) ? [...assignees, task.assignee] : assignees;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setV(initial());
          setErrors({});
        }
      }}
    >
      <DialogTrigger asChild>
        {task ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Edit task: ${task.title}`}>
            <Pencil aria-hidden="true" />
          </Button>
        ) : (
          <Button size={trigger === "small" ? "sm" : "default"} variant={trigger === "small" ? "outline" : "default"}>
            <Plus aria-hidden="true" /> {trigger === "small" ? "Add task" : "New task"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setErrors({});
            const payload = { ...v, dueAt: v.dueAt || null, assigneeId: v.assigneeId || null, description: v.description };
            const r = task
              ? await run(() => updateTaskAction({ ...payload, taskId: task.id }), "Task updated")
              : await run(() => createTaskAction({ ...payload, enquiryId: enquiryId ?? null }), "Task added");
            if (r.ok) setOpen(false);
            else if (r.error.fieldErrors) setErrors(r.error.fieldErrors);
          }}
        >
          <DialogHeader>
            <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
            <DialogDescription>{enquiryId || task?.enquiry ? "Linked to this enquiry." : "Assign it to someone, or leave it for whoever picks it up."}</DialogDescription>
          </DialogHeader>
          <FormField id="task-title" label="Task" error={err("title")}>
            <Input {...field("title")} maxLength={200} required placeholder="e.g. Send technical rider to the venue" autoComplete="off" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="task-assigneeId" label="Assignee" error={err("assigneeId")}>
              <NativeSelect {...field("assigneeId")}>
                <option value="">Unassigned</option>
                {options.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id === currentUserId ? `${a.name} (me)` : a.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="task-priority" label="Priority" error={err("priority")}>
              <NativeSelect {...field("priority")}>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <FormField id="task-dueAt" label="Due" optional error={err("dueAt")} hint="India time (IST)">
            <Input {...field("dueAt")} type="datetime-local" />
          </FormField>
          <FormField id="task-description" label="Details" optional error={err("description")}>
            <Textarea {...field("description")} rows={3} maxLength={5000} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {task ? "Save" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
