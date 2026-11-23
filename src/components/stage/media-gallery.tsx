"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface GalleryImage {
  id: string;
  url: string;
  alt: string;
}

/** Photo grid with an accessible lightbox (keyboard arrows, Esc, focus trap). */
/**
 * Layout (lg, 3 columns): the first photo spans 2×2 with two photos stacked
 * beside it, then rows of three. The final photo widens to close any gap.
 */
function tileClass(i: number, count: number): string {
  if (i === 0) return "col-span-2 row-span-2 aspect-square";
  const remainder = Math.max(0, count - 3) % 3;
  const isLast = i === count - 1 && i >= 3;
  if (isLast && remainder === 1) return "col-span-2 lg:col-span-3 aspect-[2/1] lg:aspect-[3/1]";
  if (isLast && remainder === 2) return "lg:col-span-2 aspect-square lg:aspect-auto";
  return "aspect-square";
}

export function MediaGallery({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const current = open === null ? null : images[open];
  const step = useCallback(
    (delta: number) => setOpen((i) => (i === null ? i : (i + delta + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {images.map((img, i) => (
          <li key={img.id} className={cn(tileClass(i, images.length).split(" ").filter((c) => c.includes("span")).join(" "))}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className={cn(
                "focus-ring group relative block h-full w-full overflow-hidden rounded-2xl",
                tileClass(i, images.length).split(" ").filter((c) => !c.includes("span")).join(" "),
              )}
              aria-label={`Open photo: ${img.alt}`}
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                sizes={i === 0 ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw"}
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>
      <DialogPrimitive.Root open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur" />
          <DialogPrimitive.Content className="stage fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4 outline-none sm:p-12">
            <DialogPrimitive.Title className="sr-only">{current?.alt ?? "Photo"}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Photo {open === null ? 0 : open + 1} of {images.length}. Use the arrow keys to browse.
            </DialogPrimitive.Description>
            {current && (
              <div className="relative h-full w-full">
                <Image src={current.url} alt={current.alt} fill sizes="100vw" className="object-contain" />
              </div>
            )}
            <DialogPrimitive.Close className="focus-ring absolute top-4 right-4 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Close">
              <X className="size-5" />
            </DialogPrimitive.Close>
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="focus-ring absolute left-4 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                  <ChevronLeft className="size-5" />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Next photo" className="focus-ring absolute right-4 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
