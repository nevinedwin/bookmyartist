"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { NativeSelect } from "@/components/desk/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface FilterSelect {
  key: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
}

export interface FilterToggle {
  key: string;
  label: string;
}

/** URL-driven list filters: the URL is the state, so views are shareable and Back works. */
export function ListFilters({
  searchLabel,
  placeholder,
  selects = [],
  toggles = [],
}: {
  searchLabel: string;
  placeholder: string;
  selects?: FilterSelect[];
  toggles?: FilterToggle[];
}) {
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
  const keys = ["q", ...selects.map((s) => s.key), ...toggles.map((t) => t.key)];
  const hasFilters = keys.some((k) => params.has(k));

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <label className="relative w-full sm:w-auto sm:min-w-64 sm:flex-1 lg:max-w-sm">
        <span className="sr-only">{searchLabel}</span>
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={q}
          placeholder={placeholder}
          className="pl-8"
          onChange={(e) => {
            const value = e.target.value;
            setQ(value);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => update({ q: value.trim() || null }), 300);
          }}
        />
      </label>
      {selects.map((s) => (
        <NativeSelect
          key={s.key}
          aria-label={s.label}
          className="min-w-36 flex-1 sm:flex-none"
          value={params.get(s.key) ?? ""}
          onChange={(e) => update({ [s.key]: e.target.value || null })}
        >
          <option value="">{s.allLabel}</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      ))}
      {toggles.map((t) => (
        <label key={t.key} className="flex items-center gap-2 px-1 text-sm whitespace-nowrap">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={params.get(t.key) === "1"}
            onChange={(e) => update({ [t.key]: e.target.checked ? "1" : null })}
          />
          {t.label}
        </label>
      ))}
      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQ("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
        >
          <X aria-hidden="true" /> Clear
        </Button>
      ) : null}
    </div>
  );
}
