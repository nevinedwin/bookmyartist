import { AlarmClock } from "lucide-react";
import Link from "next/link";
import { PriorityLabel, statusDot } from "@/components/desk/badges";
import { formatBudget } from "@/components/desk/format";
import { ENQUIRY_STATUS_LABELS, EVENT_TYPE_LABELS } from "@/lib/labels";
import { formatCalendarDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { BOARD_COLUMN_LIMIT, type BoardColumn } from "@/server/services/admin/enquiries";

/** Pipeline board. Cards open the enquiry, where the status is changed with full validation. */
export function EnquiryBoard({ columns }: { columns: BoardColumn[] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <ol className="flex min-w-max gap-3" aria-label="Enquiry pipeline">
        {columns.map((col) => (
          <li key={col.status} className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/40">
            <h2 className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium">
              <span className={cn("size-2 rounded-full", statusDot(col.status))} aria-hidden="true" />
              {ENQUIRY_STATUS_LABELS[col.status]}
              <span className="ml-auto rounded-full bg-background px-2 text-xs text-muted-foreground tabular-nums">{col.total}</span>
            </h2>
            <ul className="grid max-h-[calc(100dvh-16rem)] gap-2 overflow-y-auto px-2 pb-2">
              {col.items.length === 0 ? <li className="px-1 py-6 text-center text-xs text-muted-foreground">No enquiries</li> : null}
              {col.items.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/admin/enquiries/${e.id}`}
                    className="block rounded-lg border bg-card p-3 shadow-xs transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm leading-snug font-medium">{e.contactName}</p>
                      <PriorityLabel priority={e.priority} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {EVENT_TYPE_LABELS[e.eventType]} · {formatCalendarDate(e.eventDate)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.eventCity}
                      {formatBudget(e.budgetMin, e.budgetMax) ? ` · ${formatBudget(e.budgetMin, e.budgetMax)}` : ""}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">{e.owner?.name ?? "Unassigned"}</span>
                      {e.followUpDue ? (
                        <span className="inline-flex items-center gap-1 font-medium text-orange-700">
                          <AlarmClock className="size-3" aria-hidden="true" /> Follow-up due
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{e.reference}</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
              {col.total > col.items.length ? (
                <li className="px-1 py-2 text-center text-xs">
                  <Link href={`/admin/enquiries?status=${col.status}`} className="text-primary hover:underline">
                    Showing {BOARD_COLUMN_LIMIT} of {col.total} — view all
                  </Link>
                </li>
              ) : null}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
