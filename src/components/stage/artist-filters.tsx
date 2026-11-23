"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { EventType } from "@/generated/prisma/enums";
import { BUDGET_RANGES, EVENT_TYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

const selectClass =
  "focus-ring h-12 w-full appearance-none rounded-full border border-white/15 bg-midnight-900 bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23a8a3c2' stroke-width='2'%3E%3Cpath d='M2 4l4 4 4-4'/%3E%3C/svg%3E\")] bg-[length:12px] bg-[right_1.1rem_center] bg-no-repeat pr-10 pl-5 text-sm text-ink";

/**
 * URL-driven filters: every change updates the query string, so results are
 * server-rendered, shareable and work with the back button.
 */
export function ArtistFilters({
  categories,
  cities,
  performanceTypes,
}: {
  categories: Option[];
  cities: string[];
  performanceTypes: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  // Debounced free-text search.
  useEffect(() => {
    if ((params.get("q") ?? "") === q) return;
    const id = window.setTimeout(() => update({ q: q.trim() || null }), 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeCount = ["category", "city", "event", "type", "budget", "available"].filter((k) => params.get(k)).length;

  return (
    <div className="space-y-4" aria-busy={pending}>
      <div className="flex gap-3">
        <label className="relative flex-1">
          <span className="sr-only">Search artists</span>
          <Search className="pointer-events-none absolute top-1/2 left-5 z-10 size-4 -translate-y-1/2 text-haze" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, style or city…"
            className="focus-ring h-14 w-full rounded-full border border-white/15 bg-white/5 pr-5 pl-12 text-base text-ink placeholder:text-haze/70 backdrop-blur"
          />
        </label>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="artist-filter-panel"
          className="focus-ring inline-flex h-14 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 text-sm text-ink lg:hidden"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters{activeCount > 0 && <span className="rounded-full bg-magenta px-2 text-xs">{activeCount}</span>}
        </button>
      </div>

      <div id="artist-filter-panel" className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]", !open && "hidden lg:grid")}>
        <label>
          <span className="sr-only">Category</span>
          <select className={selectClass} value={params.get("category") ?? ""} onChange={(e) => update({ category: e.target.value || null })}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">City</span>
          <select className={selectClass} value={params.get("city") ?? ""} onChange={(e) => update({ city: e.target.value || null })}>
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Event type</span>
          <select className={selectClass} value={params.get("event") ?? ""} onChange={(e) => update({ event: e.target.value || null })}>
            <option value="">Any event</option>
            {(Object.keys(EVENT_TYPE_LABELS) as EventType[])
              .filter((e) => e !== "OTHER")
              .map((e) => (
                <option key={e} value={e}>
                  {EVENT_TYPE_LABELS[e]}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Performance type</span>
          <select className={selectClass} value={params.get("type") ?? ""} onChange={(e) => update({ type: e.target.value || null })}>
            <option value="">Any format</option>
            {performanceTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Budget (artists with published pricing)</span>
          <select className={selectClass} value={params.get("budget") ?? ""} onChange={(e) => update({ budget: e.target.value || null })}>
            <option value="">Any budget</option>
            {BUDGET_RANGES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.filterLabel}
              </option>
            ))}
          </select>
        </label>
        <label className="focus-within:ring-violet-glow flex h-12 cursor-pointer items-center justify-between gap-3 rounded-full whitespace-nowrap border border-white/15 bg-midnight-900 px-5 text-sm text-ink focus-within:ring-2">
          Verified availability
          <input
            type="checkbox"
            className="size-4 accent-magenta"
            checked={params.get("available") === "1"}
            onChange={(e) => update({ available: e.target.checked ? "1" : null })}
          />
        </label>
      </div>

      {(activeCount > 0 || params.get("q")) && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full text-sm text-violet-glow hover:text-ink"
        >
          <X className="size-4" aria-hidden="true" /> Clear all filters
        </button>
      )}
    </div>
  );
}
