"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useState } from "react";
import type { ServiceContent } from "@/content/services";
import { sized } from "@/content/images";

/**
 * Editorial service index. On desktop, hovering a row floats a preview image
 * that follows the cursor.
 */
export function ServicesList({ services }: { services: Pick<ServiceContent, "slug" | "name" | "kicker" | "intro" | "heroImage">[] }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 28 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 28 });
  const activeService = active === null ? null : services[active];

  return (
    <div
      className="relative mt-14"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - rect.left);
        y.set(e.clientY - rect.top);
      }}
      onPointerLeave={() => setActive(null)}
    >
      <ol className="border-t border-white/10">
        {services.map((s, i) => (
          <li key={s.slug} className="border-b border-white/10">
            <Link
              href={`/services/${s.slug}`}
              onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="focus-ring group grid grid-cols-[auto_1fr_auto] items-center gap-5 rounded-lg py-7 sm:gap-10 sm:py-9"
            >
              <span className="font-display text-sm text-ink/40 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0">
                <span className="block font-display text-3xl font-semibold tracking-tight text-ink transition-all duration-500 group-hover:translate-x-2 group-hover:text-gradient sm:text-5xl lg:text-6xl">
                  {s.name}
                </span>
                <span className="mt-2 block text-sm text-haze sm:text-base">{s.kicker}</span>
              </span>
              <span className="flex size-12 items-center justify-center rounded-full border border-white/20 transition-all duration-500 group-hover:border-transparent group-hover:bg-gradient-to-br group-hover:from-electric group-hover:to-magenta sm:size-14">
                <ArrowUpRight className="size-5 transition-transform duration-500 group-hover:rotate-45" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {!reduce && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-10 hidden h-64 w-80 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl lg:block"
          style={{ x, y }}
        >
          <AnimatePresence>
            {activeService && (
              <motion.div
                key={activeService.slug}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <Image src={sized(activeService.heroImage, 640)} alt="" fill sizes="320px" className="object-cover" unoptimized />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
