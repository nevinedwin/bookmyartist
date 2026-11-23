import type { EnquiryStatus, Priority } from "@/generated/prisma/enums";
import { ENQUIRY_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Colour pairs always carry a text label too — colour is never the only signal. */
const STATUS_STYLES: Record<EnquiryStatus, string> = {
  NEW: "bg-sky-50 text-sky-800 ring-sky-200",
  CONTACTED: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  QUALIFIED: "bg-violet-50 text-violet-800 ring-violet-200",
  QUOTATION_SENT: "bg-amber-50 text-amber-900 ring-amber-200",
  NEGOTIATION: "bg-orange-50 text-orange-900 ring-orange-200",
  CONFIRMED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  LOST: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  CANCELLED: "bg-rose-50 text-rose-800 ring-rose-200",
};

const STATUS_DOTS: Record<EnquiryStatus, string> = {
  NEW: "bg-sky-500",
  CONTACTED: "bg-indigo-500",
  QUALIFIED: "bg-violet-500",
  QUOTATION_SENT: "bg-amber-500",
  NEGOTIATION: "bg-orange-500",
  CONFIRMED: "bg-emerald-500",
  LOST: "bg-zinc-400",
  CANCELLED: "bg-rose-500",
};

export function statusDot(status: EnquiryStatus) {
  return STATUS_DOTS[status];
}

export function EnquiryStatusBadge({ status, className }: { status: EnquiryStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOTS[status])} aria-hidden="true" />
      {ENQUIRY_STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-foreground",
  HIGH: "text-orange-700 font-medium",
  URGENT: "text-rose-700 font-semibold",
};

const PRIORITY_BARS: Record<Priority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };

export function PriorityLabel({ priority }: { priority: Priority }) {
  const level = PRIORITY_BARS[priority];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap", PRIORITY_STYLES[priority])}>
      <span className="flex items-end gap-px" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("w-0.5 rounded-full", i <= level ? "bg-current" : "bg-border")} style={{ height: 3 + i * 2 }} />
        ))}
      </span>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
