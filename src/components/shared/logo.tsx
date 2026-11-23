import { cn } from "@/lib/utils";

/**
 * Wordmark: "BookMy" + accented "Artist" + a magenta "beat" dot. Rendered as
 * text (not an image) so it stays crisp and is read correctly by screen readers.
 */
export function Logo({ className, accentClassName }: { className?: string; accentClassName?: string }) {
  return (
    <span className={cn("font-display text-lg font-bold tracking-tight", className)} aria-label="BookMyArtist">
      <span aria-hidden="true">
        BookMy<span className={cn("text-violet-glow", accentClassName)}>Artist</span>
        <span className="text-magenta">.</span>
      </span>
    </span>
  );
}
