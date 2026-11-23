import { Bell } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/desk/empty-state";
import { MarkAllReadButton, MarkReadButton } from "@/components/desk/mark-read-button";
import { PageHeader } from "@/components/desk/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { requireActor } from "@/server/auth/dal";
import { listNotifications } from "@/server/services/admin/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Notifications />
    </Suspense>
  );
}

/** Only follow in-app links, never arbitrary URLs stored in a notification. */
const safeHref = (href: string | null) => (href && href.startsWith("/admin/") ? href : null);

async function Notifications() {
  const actor = await requireActor();
  const items = await listNotifications(actor);
  const unread = items.some((n) => !n.readAt);
  return (
    <div className="grid gap-5">
      <PageHeader title="Notifications" description="Your latest 50 notifications." actions={unread ? <MarkAllReadButton /> : null} />
      {items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications">
          You&apos;ll be notified about new enquiries and work assigned to you.
        </EmptyState>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {items.map((n) => {
            const href = safeHref(n.href);
            return (
              <li key={n.id} className={cn("flex items-start gap-3 px-4 py-3", !n.readAt && "bg-primary/[0.03]")}>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-primary")} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !n.readAt && "font-medium")}>
                    {href ? (
                      <Link href={href} className="hover:underline">
                        {n.title}
                      </Link>
                    ) : (
                      n.title
                    )}
                    {!n.readAt ? <span className="sr-only"> (unread)</span> : null}
                  </p>
                  {n.body ? <p className="truncate text-sm text-muted-foreground">{n.body}</p> : null}
                  <p className="text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                </div>
                {!n.readAt ? <MarkReadButton id={n.id} /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
