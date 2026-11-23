import { cn } from "@/lib/utils";

const HEIGHTS = [0.55, 0.9, 0.4, 1, 0.7, 0.35, 0.85, 0.6, 0.95, 0.45, 0.75, 0.5];

/** Decorative animated equaliser bars (CSS only, paused under reduced motion). */
export function Equalizer({ bars = 12, className }: { bars?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex h-8 items-end gap-[3px]", className)}>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className="w-[3px] origin-bottom animate-eq rounded-full bg-gradient-to-t from-electric to-magenta"
          style={{ height: `${(HEIGHTS[i % HEIGHTS.length] ?? 0.5) * 100}%`, animationDelay: `${(i * 0.13) % 1.1}s` }}
        />
      ))}
    </div>
  );
}
