"use client";

import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import type { PublicTestimonial } from "@/server/services/public/catalogue";

export function Testimonials({ items }: { items: PublicTestimonial[] }) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const item = items[index];
  if (!item) return null;
  const go = (delta: number) => setIndex((i) => (i + delta + items.length) % items.length);

  return (
    <div className="relative mt-14">
      <Quote aria-hidden="true" className="absolute -top-6 -left-2 size-24 text-electric/30" />
      <div className="relative min-h-[18rem] sm:min-h-[15rem]" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.figure
            key={item.id}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -16 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <blockquote className="max-w-5xl font-display text-[clamp(1.6rem,3.6vw,3rem)] leading-[1.15] font-medium tracking-tight text-ink">
              “{item.quote}”
            </blockquote>
            <figcaption className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold text-ink">{item.authorName}</span>
              {item.authorRole && <span className="text-haze">{item.authorRole}</span>}
              {item.eventType && (
                <span className="rounded-full border border-white/15 px-3 py-0.5 text-xs text-ink/80">{EVENT_TYPE_LABELS[item.eventType]}</span>
              )}
              {item.artist && <span className="text-violet-glow">featuring {item.artist.stageName}</span>}
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
      {items.length > 1 && (
        <div className="mt-10 flex items-center gap-4">
          <button type="button" onClick={() => go(-1)} aria-label="Previous testimonial" className="focus-ring flex size-12 items-center justify-center rounded-full border border-white/20 hover:bg-white/10">
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next testimonial" className="focus-ring flex size-12 items-center justify-center rounded-full border border-white/20 hover:bg-white/10">
            <ChevronRight className="size-5" />
          </button>
          <div className="ml-4 flex gap-2" role="tablist" aria-label="Testimonials">
            {items.map((t, i) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Testimonial ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`focus-ring h-1.5 rounded-full transition-all ${i === index ? "w-10 bg-magenta" : "w-4 bg-white/25 hover:bg-white/40"}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
