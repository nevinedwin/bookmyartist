import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WordsReveal } from "./reveal";

/** Editorial section heading: index number, eyebrow and a large display title. */
export function SectionHeading({
  index,
  eyebrow,
  title,
  id,
  children,
  className,
  align = "left",
}: {
  index?: string;
  eyebrow: string;
  title: string;
  id?: string;
  children?: ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-4xl", align === "center" && "mx-auto text-center", className)}>
      <p className={cn("flex items-center gap-3 text-xs font-medium tracking-[0.3em] text-violet-glow uppercase", align === "center" && "justify-center")}>
        {index && <span className="font-display text-ink/40">{index}</span>}
        <span className="h-px w-8 bg-gradient-to-r from-electric to-magenta" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 id={id} className="mt-5 font-display text-[clamp(2.1rem,5.2vw,4.75rem)] leading-[0.98] font-semibold tracking-[-0.025em] text-ink">
        <WordsReveal text={title} />
      </h2>
      {children && <div className="mt-6 text-lg leading-relaxed text-haze">{children}</div>}
    </div>
  );
}
