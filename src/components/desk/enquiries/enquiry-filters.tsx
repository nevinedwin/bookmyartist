"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { NativeSelect } from "@/components/desk/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ENQUIRY_SOURCE_LABELS, ENQUIRY_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/labels";

/** URL-driven filters: the URL is the state, so views are shareable and the back button works. */
export function EnquiryFilters({ users }: { users: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    startTransition(() => router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false }));
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const view = params.get("view");
  const hasFilters = ["q", "status", "owner", "priority", "source", "followUp", "closed"].some((k) => params.has(k));

  return (
    <div
      className={cn(
        "grid gap-2 sm:grid-cols-2 lg:items-center",
        view === "board"
          ? "lg:grid-cols-[minmax(14rem,1.6fr)_repeat(4,minmax(0,1fr))_auto]"
          : "lg:grid-cols-[minmax(14rem,1.6fr)_repeat(5,minmax(0,1fr))_auto]",
      )}
      aria-busy={pending}
    >
      <label className="relative sm:col-span-2 lg:col-span-1">
        <span className="sr-only">Search enquiries</span>
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={q}
          placeholder="Name, reference, email, phone, city…"
          className="pl-8"
          onChange={(e) => {
            const value = e.target.value;
            setQ(value);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => update({ q: value.trim() || null }), 300);
          }}
        />
      </label>
      {view !== "board" ? (
        <NativeSelect aria-label="Status" value={params.get("status") ?? ""} onChange={(e) => update({ status: e.target.value || null })}>
          <option value="">{params.get("closed") === "1" ? "All statuses" : "All open statuses"}</option>
          {Object.entries(ENQUIRY_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      ) : null}
      <NativeSelect aria-label="Owner" value={params.get("owner") ?? ""} onChange={(e) => update({ owner: e.target.value || null })}>
        <option value="">Any owner</option>
        <option value="me">Mine</option>
        <option value="unassigned">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect aria-label="Priority" value={params.get("priority") ?? ""} onChange={(e) => update({ priority: e.target.value || null })}>
        <option value="">Any priority</option>
        {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect aria-label="Source" value={params.get("source") ?? ""} onChange={(e) => update({ source: e.target.value || null })}>
        <option value="">Any source</option>
        {Object.entries(ENQUIRY_SOURCE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect aria-label="Follow-up" value={params.get("followUp") ?? ""} onChange={(e) => update({ followUp: e.target.value || null })}>
        <option value="">Any follow-up</option>
        <option value="due">Due today or overdue</option>
        <option value="none">No follow-up set</option>
      </NativeSelect>
      <div className="flex items-center gap-3 lg:justify-end">
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={params.get("closed") === "1"}
            onChange={(e) => update({ closed: e.target.checked ? "1" : null })}
          />
          Include closed
        </label>
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              startTransition(() => router.replace(view === "board" ? `${pathname}?view=board` : pathname, { scroll: false }));
            }}
          >
            <X aria-hidden="true" /> Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
