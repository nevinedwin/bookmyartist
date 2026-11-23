import { AlarmClock } from "lucide-react";
import Link from "next/link";
import { EnquiryStatusBadge, PriorityLabel } from "@/components/desk/badges";
import { formatBudget } from "@/components/desk/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { formatCalendarDate, formatDate, formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { EnquiryListItem } from "@/server/services/admin/enquiries";

export function EnquiryTable({ items }: { items: EnquiryListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table className="min-w-[960px]">
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[26%]">Enquiry</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Follow-up</TableHead>
            <TableHead className="text-right">Received</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((e) => (
            <TableRow key={e.id} className="group relative">
              <TableCell>
                {/* The whole row is clickable via this stretched link; other cells stay plain text. */}
                <Link
                  href={`/admin/enquiries/${e.id}`}
                  className="font-medium after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:ring-2 after:focus-visible:ring-ring after:focus-visible:ring-inset"
                >
                  {e.contactName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {e.reference}
                  {e.organization ? ` · ${e.organization}` : ""}
                </p>
                {e.artistNames.length ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">Wants: {e.artistNames.join(", ")}</p>
                ) : null}
              </TableCell>
              <TableCell>
                <p className="text-sm">{EVENT_TYPE_LABELS[e.eventType]}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCalendarDate(e.eventDate)} · {e.eventCity}
                </p>
              </TableCell>
              <TableCell className="text-sm tabular-nums">{formatBudget(e.budgetMin, e.budgetMax) ?? <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell>
                <EnquiryStatusBadge status={e.status} />
              </TableCell>
              <TableCell>
                <PriorityLabel priority={e.priority} />
              </TableCell>
              <TableCell className="text-sm">{e.owner?.name ?? <span className="text-muted-foreground">Unassigned</span>}</TableCell>
              <TableCell>
                {e.nextFollowUpAt ? (
                  <span className={cn("inline-flex items-center gap-1 text-xs", e.followUpDue ? "font-medium text-orange-700" : "text-muted-foreground")}>
                    {e.followUpDue ? <AlarmClock className="size-3.5" aria-hidden="true" /> : null}
                    {e.followUpDue ? "Due · " : ""}
                    {formatDateTime(e.nextFollowUpAt)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">{formatDate(e.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
