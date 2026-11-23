import { ListTodo } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState } from "@/components/desk/empty-state";
import { ListFilters } from "@/components/desk/list-filters";
import { NoAccess } from "@/components/desk/no-access";
import { PageHeader } from "@/components/desk/page-header";
import { Pagination } from "@/components/desk/pagination";
import { toQuery } from "@/components/desk/query";
import { TaskDialog } from "@/components/desk/tasks/task-dialog";
import { TaskList } from "@/components/desk/tasks/task-list";
import { Skeleton } from "@/components/ui/skeleton";
import { PRIORITY_LABELS } from "@/lib/labels";
import { TASK_PAGE_SIZE, taskListParamsSchema } from "@/lib/validation/tasks";
import { can } from "@/server/auth/actor";
import { actorWith } from "@/server/auth/dal";
import { listTaskAssignees, listTasks } from "@/server/services/admin/tasks";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage({ searchParams }: PageProps<"/admin/tasks">) {
  return (
    <div className="grid gap-5">
      <Suspense fallback={<ListSkeleton />}>
        <Tasks searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Tasks({ searchParams }: { searchParams: PageProps<"/admin/tasks">["searchParams"] }) {
  const actor = await actorWith("task:read");
  if (!actor) return <NoAccess what="tasks" />;
  const raw = await searchParams;
  const params = taskListParamsSchema.parse(raw);
  const canWrite = can(actor, "task:write");
  const [result, assignees] = await Promise.all([listTasks(actor, params), listTaskAssignees(actor)]);
  const filtered = Boolean(params.q || params.assignee || params.due || params.priority || params.state);

  return (
    <>
      <PageHeader
        title="Tasks"
        description="The team's to-do list. Overdue first, then by due date."
        actions={canWrite ? <TaskDialog assignees={assignees} currentUserId={actor.userId} /> : null}
      />
      <ListFilters
        searchLabel="Search tasks"
        placeholder="Task, details, enquiry reference…"
        selects={[
          {
            key: "assignee",
            label: "Assignee",
            allLabel: "Everyone",
            options: [{ value: "me", label: "Mine" }, { value: "unassigned", label: "Unassigned" }, ...assignees.map((a) => ({ value: a.id, label: a.name }))],
          },
          {
            key: "due",
            label: "Due",
            allLabel: "Any due date",
            options: [
              { value: "overdue", label: "Overdue" },
              { value: "today", label: "Due today" },
              { value: "week", label: "Due within 7 days" },
              { value: "none", label: "No due date" },
            ],
          },
          { key: "priority", label: "Priority", allLabel: "Any priority", options: Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })) },
          {
            key: "state",
            label: "State",
            allLabel: "Open",
            options: [
              { value: "done", label: "Done or cancelled" },
              { value: "all", label: "All" },
            ],
          },
        ]}
      />
      {result.total === 0 ? (
        <EmptyState icon={ListTodo} title={filtered ? "No tasks match these filters" : "Nothing to do"}>
          {filtered ? "Try a different filter." : canWrite ? "Add a task here or from an enquiry." : "Tasks the team creates will appear here."}
        </EmptyState>
      ) : (
        <>
          <TaskList tasks={result.items} canWrite={canWrite} assignees={assignees} currentUserId={actor.userId} />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            pageSize={TASK_PAGE_SIZE}
            hrefFor={(page) => `/admin/tasks${toQuery(raw, { page: page > 1 ? String(page) : null })}`}
          />
        </>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading tasks">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
