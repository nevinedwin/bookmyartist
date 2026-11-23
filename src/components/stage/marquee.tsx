import { cn } from "@/lib/utils";

/** Infinite horizontal ticker. Content is duplicated for a seamless loop; the copy is hidden from AT. */
export function Marquee({
  items,
  className,
  duration = 40,
  reverse = false,
}: {
  items: string[];
  className?: string;
  duration?: number;
  reverse?: boolean;
}) {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="flex items-center">
          <span className="px-6 sm:px-10">{item}</span>
          <span aria-hidden="true" className="size-2 rounded-full bg-magenta" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className={cn("mask-fade-x flex overflow-hidden", className)}>
      <div
        className="flex w-max animate-marquee hover:[animation-play-state:paused]"
        style={{ ["--marquee-duration" as string]: `${duration}s`, animationDirection: reverse ? "reverse" : undefined }}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
