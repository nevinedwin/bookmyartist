import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  href,
  icon: Icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  href?: string;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "attention";
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className={cn("size-4", tone === "attention" && value > 0 ? "text-orange-600" : "text-muted-foreground")} aria-hidden="true" />
      </div>
      <p className={cn("mt-2 text-3xl font-semibold tabular-nums", tone === "attention" && value > 0 && "text-orange-700")}>
        {value.toLocaleString("en-IN")}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );
  const className = "block rounded-xl border bg-card p-4 transition-colors";
  return href ? (
    <Link href={href} className={cn(className, "hover:border-primary/40 hover:bg-primary/[0.02] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
