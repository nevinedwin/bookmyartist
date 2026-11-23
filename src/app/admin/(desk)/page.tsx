import { AlarmClock, BadgeAlert, CalendarDays, Contact, EyeOff, Inbox, Link2Off, ListTodo, MicVocal, Sparkles, UserPlus, UserRound, UserX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EnquiryStatusBadge, statusDot } from "@/components/desk/badges";
import { EmptyState } from "@/components/desk/empty-state";
import { PageHeader } from "@/components/desk/page-header";
import { StatCard } from "@/components/desk/stat-card";
import { TaskList } from "@/components/desk/tasks/task-list";
import { Skeleton } from "@/components/ui/skeleton";
import { ENQUIRY_STATUS_LABELS, EVENT_TYPE_LABELS } from "@/lib/labels";
import { formatCalendarDate, formatDateTime, toBusinessTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { can } from "@/server/auth/actor";
import { requireActor } from "@/server/auth/dal";
import type { Actor } from "@/server/auth/actor";
import { getClientOverview, getEnquiryOverview, getRecentEnquiries, getRosterOverview } from "@/server/services/admin/dashboard";
import { getTaskSummary, listTaskAssignees } from "@/server/services/admin/tasks";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

function greeting(now: Date) {
  const h = toBusinessTime(now).getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

async function Dashboard() {
  const actor = await requireActor();
  const firstName = actor.name.split(/\s+/)[0] ?? actor.name;
  const title = `${greeting(new Date())}, ${firstName}`;
  const sections = {
    enquiries: can(actor, "enquiry:read"),
    tasks: can(actor, "task:read"),
    artists: can(actor, "artist:read"),
    clients: can(actor, "client:read"),
  };

  if (!Object.values(sections).some(Boolean)) {
    return (
      <div className="grid gap-6">
        <PageHeader title={title} description={`Signed in as ${actor.roleName}.`} />
        <EmptyState icon={Sparkles} title="Nothing to show yet">
          Your role doesn&apos;t include any dashboard modules. Ask an admin if you need access.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <PageHeader title={title} description="Here's where things stand right now." />
      {sections.enquiries ? <EnquirySections actor={actor} /> : null}
      {sections.tasks ? <MyTasks actor={actor} /> : null}
      {sections.artists || sections.clients ? (
        <section aria-label="Roster and clients" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {sections.artists ? <RosterCards actor={actor} /> : null}
          {sections.clients ? <ClientCards actor={actor} /> : null}
        </section>
      ) : null}
    </div>
  );
}

async function EnquirySections({ actor }: { actor: Actor }) {
  const [overview, recent] = await Promise.all([getEnquiryOverview(actor), getRecentEnquiries(actor)]);
  const pipelineMax = Math.max(1, ...overview.pipeline.map((p) => p.count));

  return (
    <>
      <section aria-label="Enquiry summary" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Follow-ups due" value={overview.followUpsDue} icon={AlarmClock} href="/admin/enquiries?followUp=due" hint="Today or overdue" tone="attention" />
        <StatCard label="New (7 days)" value={overview.newLast7Days} icon={Inbox} hint="Received in the last 7 days" />
        <StatCard label="Open" value={overview.open} icon={Sparkles} href="/admin/enquiries" hint="Not yet won or lost" />
        <StatCard label="Unassigned" value={overview.unassigned} icon={UserX} href="/admin/enquiries?owner=unassigned" hint="Open, no owner" tone="attention" />
        <StatCard label="Mine" value={overview.mine} icon={UserRound} href="/admin/enquiries?owner=me" hint="Open, owned by you" />
        <StatCard label="Events ≤ 30 days" value={overview.eventsNext30Days} icon={CalendarDays} hint="Open enquiries" />
      </section>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <section aria-labelledby="pipeline-title" className="rounded-xl border bg-card p-5">
          <h2 id="pipeline-title" className="font-medium">Pipeline</h2>
          <p className="text-sm text-muted-foreground">All enquiries by status</p>
          <ul className="mt-5 grid gap-3">
            {overview.pipeline.map((p) => (
              <li key={p.status}>
                <Link
                  href={`/admin/enquiries?status=${p.status}`}
                  className="group grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 rounded-md text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="truncate text-muted-foreground group-hover:text-foreground">{ENQUIRY_STATUS_LABELS[p.status]}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <span className={cn("block h-full rounded-full", statusDot(p.status))} style={{ width: `${(p.count / pipelineMax) * 100}%` }} />
                  </span>
                  <span className="text-right font-medium tabular-nums">{p.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="recent-title" className="rounded-xl border bg-card">
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <h2 id="recent-title" className="font-medium">Latest enquiries</h2>
              <p className="text-sm text-muted-foreground">Newest first</p>
            </div>
            <Link href="/admin/enquiries?closed=1" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="p-5 pt-0">
              <EmptyState icon={Inbox} title="No enquiries yet">
                Enquiries from the website&apos;s booking and contact forms will appear here.
              </EmptyState>
            </div>
          ) : (
            <ul className="divide-y">
              {recent.map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/enquiries/${e.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-muted/50 focus-visible:bg-muted focus-visible:outline-none">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.contactName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.reference} · {EVENT_TYPE_LABELS[e.eventType]} · {formatCalendarDate(e.eventDate)} · {e.eventCity}
                      </p>
                    </div>
                    <EnquiryStatusBadge status={e.status} />
                    <p className="w-full text-xs text-muted-foreground sm:w-36 sm:text-right">
                      {formatDateTime(e.createdAt)}
                      <span className="block">{e.owner ? e.owner.name : "Unassigned"}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

async function MyTasks({ actor }: { actor: Actor }) {
  const canWrite = can(actor, "task:write");
  const [summary, assignees] = await Promise.all([getTaskSummary(actor), canWrite ? listTaskAssignees(actor) : []]);
  return (
    <section aria-labelledby="tasks-title" className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
      <div className="grid grid-cols-2 gap-3 self-start">
        <StatCard label="My overdue tasks" value={summary.mineOverdue} icon={AlarmClock} href="/admin/tasks?assignee=me&due=overdue" tone="attention" />
        <StatCard label="Due today" value={summary.mineDueToday} icon={ListTodo} href="/admin/tasks?assignee=me&due=today" hint="Still to do today" />
        <StatCard label="My open tasks" value={summary.mineOpen} icon={UserRound} href="/admin/tasks?assignee=me" />
        <StatCard label="Unassigned tasks" value={summary.unassignedOpen} icon={UserX} href="/admin/tasks?assignee=unassigned" tone="attention" />
      </div>
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h2 id="tasks-title" className="font-medium">My next tasks</h2>
            <p className="text-sm text-muted-foreground">Soonest due first</p>
          </div>
          <Link href="/admin/tasks?assignee=me" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="p-5 pt-0">
          {summary.upcomingMine.length ? (
            <TaskList tasks={summary.upcomingMine} canWrite={canWrite} assignees={assignees} currentUserId={actor.userId} />
          ) : (
            <EmptyState icon={ListTodo} title="You're all caught up">
              Tasks assigned to you will appear here.
            </EmptyState>
          )}
        </div>
      </div>
    </section>
  );
}

async function RosterCards({ actor }: { actor: Actor }) {
  const roster = await getRosterOverview(actor);
  return (
    <>
      <StatCard label="Artists on website" value={roster.onWebsite} icon={MicVocal} href="/admin/artists?status=ACTIVE" hint={`${roster.featured} featured`} />
      <StatCard label="Hidden artists" value={roster.hidden} icon={EyeOff} href="/admin/artists?status=INACTIVE" hint="Inactive or on hold" />
      <StatCard label="Availability unchecked" value={roster.availabilityStale} icon={BadgeAlert} href="/admin/artists?status=ACTIVE" hint="On website, not checked in 30 days" tone="attention" />
    </>
  );
}

async function ClientCards({ actor }: { actor: Actor }) {
  const clients = await getClientOverview(actor);
  return (
    <>
      <StatCard label="Clients" value={clients.total} icon={Contact} href="/admin/clients" hint="Not archived" />
      <StatCard label="New clients (30 days)" value={clients.newLast30Days} icon={UserPlus} />
      {clients.unlinkedOpenEnquiries !== null ? (
        <StatCard label="Enquiries without client" value={clients.unlinkedOpenEnquiries} icon={Link2Off} href="/admin/enquiries" hint="Open, not linked yet" />
      ) : null}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-8" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
