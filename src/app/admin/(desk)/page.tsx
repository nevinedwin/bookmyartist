import { AlarmClock, CalendarDays, Inbox, Sparkles, UserRound, UserX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EnquiryStatusBadge, statusDot } from "@/components/desk/badges";
import { EmptyState } from "@/components/desk/empty-state";
import { PageHeader } from "@/components/desk/page-header";
import { StatCard } from "@/components/desk/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ENQUIRY_STATUS_LABELS, EVENT_TYPE_LABELS } from "@/lib/labels";
import { formatCalendarDate, formatDateTime, toBusinessTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { can } from "@/server/auth/actor";
import { requireActor } from "@/server/auth/dal";
import { getEnquiryOverview, getRecentEnquiries } from "@/server/services/admin/dashboard";

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

  if (!can(actor, "enquiry:read")) {
    return (
      <div className="grid gap-6">
        <PageHeader title={title} description={`Signed in as ${actor.roleName}.`} />
        <EmptyState icon={Sparkles} title="Nothing to show yet">
          Your role doesn&apos;t include enquiries. More modules arrive in upcoming releases.
        </EmptyState>
      </div>
    );
  }

  const [overview, recent] = await Promise.all([getEnquiryOverview(actor), getRecentEnquiries(actor)]);
  const pipelineMax = Math.max(1, ...overview.pipeline.map((p) => p.count));

  return (
    <div className="grid gap-8">
      <PageHeader title={title} description="Here's where the enquiry pipeline stands right now." />

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
    </div>
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
