"use client";

import { AlertCircle } from "lucide-react";
import { useId, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-2xl border bg-white/[0.04] px-4 text-base text-ink placeholder:text-haze/60 transition-colors focus:border-violet-glow focus:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow/40 disabled:opacity-50";

export function Field({
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (props: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-medium text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-haze">Optional</span>}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-haze">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-sm text-[#ff8fa3]" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(control, "h-13", props["aria-invalid"] ? "border-[#ff8fa3]" : "border-white/15", "[color-scheme:dark]", className)}
    />
  );
}

export function SelectInput({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        control,
        "h-13 appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23a8a3c2' stroke-width='2'%3E%3Cpath d='M2 4l4 4 4-4'/%3E%3C/svg%3E\")] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10 [&>option]:bg-midnight-900",
        props["aria-invalid"] ? "border-[#ff8fa3]" : "border-white/15",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={4}
      {...props}
      className={cn(control, "min-h-28 resize-y py-3", props["aria-invalid"] ? "border-[#ff8fa3]" : "border-white/15", className)}
    />
  );
}

/** Large selectable tiles (radio group) used for event types. */
export function ChoiceTiles<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
}: {
  name: string;
  legend: string;
  options: { value: T; label: string; hint?: string }[];
  value: string;
  onChange: (v: T) => void;
  error?: string;
}) {
  const errorId = useId();
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="text-sm font-medium text-ink">{legend}</legend>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "relative flex cursor-pointer flex-col rounded-2xl border px-4 py-3.5 text-sm transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-glow",
              value === o.value
                ? "border-transparent bg-gradient-to-br from-electric/90 to-magenta/80 text-white shadow-[0_10px_30px_-12px_rgb(233_53_193/0.7)]"
                : "border-white/15 bg-white/[0.03] text-ink hover:border-white/30",
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            <span className="font-medium">{o.label}</span>
            {o.hint && <span className="mt-0.5 text-xs opacity-75">{o.hint}</span>}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-[#ff8fa3]">
          <AlertCircle className="size-4" aria-hidden="true" /> {error}
        </p>
      )}
    </fieldset>
  );
}

/** Visually hidden honeypot. Real users never see or fill it. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
      <label>
        Leave this field empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
