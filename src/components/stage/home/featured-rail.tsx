"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Horizontal rail. On large screens with motion allowed, the section pins and
 * vertical scroll drives horizontal travel (GSAP ScrollTrigger). Otherwise it
 * is a native, swipeable scroll-snap row.
 */
export function FeaturedRail({ children, header }: { children: ReactNode; header: ReactNode }) {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    if (!mq.matches) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled || !sectionRef.current || !trackRef.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const track = trackRef.current;
      const ctx = gsap.context(() => {
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 96);
        gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
      }, sectionRef);
      cleanup = () => ctx.revert();
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [reduce]);

  return (
    <div ref={sectionRef} className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden py-24">
      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">{header}</div>
      <div
        ref={trackRef}
        className="mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 [scrollbar-width:none] sm:px-8 lg:w-max lg:snap-none lg:overflow-visible lg:px-12 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
