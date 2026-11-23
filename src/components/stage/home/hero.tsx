"use client";

import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import { Cta } from "../cta";
import { Equalizer } from "../equalizer";
import { Magnetic } from "../magnetic";

interface HeroSlide {
  src: string;
  alt: string;
  caption: string;
}

const EASE = [0.16, 1, 0.3, 1] as const;
const SLIDE_MS = 6500;

export function Hero({ slides, stats }: { slides: HeroSlide[]; stats: { artists: number; categories: number; cities: number } }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Cross-fade background photography.
  useEffect(() => {
    if (reduce || slides.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [reduce, slides.length]);

  // Scroll-scrubbed parallax: media drifts slower than the page, copy lifts and fades.
  useEffect(() => {
    if (reduce) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled || !sectionRef.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        const trigger = { trigger: sectionRef.current, start: "top top", end: "bottom top", scrub: true };
        gsap.to(mediaRef.current, { yPercent: 18, scale: 1.08, ease: "none", scrollTrigger: trigger });
        gsap.to(contentRef.current, { yPercent: -22, opacity: 0.15, ease: "none", scrollTrigger: trigger });
      }, sectionRef);
      cleanup = () => ctx.revert();
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [reduce]);

  const slide = slides[index] ?? slides[0];
  const words = ["Every", "Celebration", "Deserves", "Its", "Own", "Soundtrack."];

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      className="grain relative isolate flex min-h-[100svh] items-end overflow-hidden bg-midnight-950"
    >
      {/* Background media */}
      <div ref={mediaRef} className="absolute inset-0 -z-20 will-change-transform">
        <AnimatePresence initial={false}>
          {slide && (
            <motion.div
              key={slide.src}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 1.6, ease: "easeInOut" }, scale: { duration: SLIDE_MS / 1000 + 1.6, ease: "linear" } }}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                preload={index === 0}
                sizes="100vw"
                quality={75}
                className="object-cover"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cinematic overlays */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-midnight-950 via-midnight-950/55 to-midnight-950/30" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-midnight-950/85 via-midnight-950/20 to-transparent" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 size-[60vw] animate-aurora rounded-full bg-electric/30 mix-blend-screen blur-[120px]" />
        <div className="absolute -right-1/4 -bottom-1/3 size-[55vw] animate-aurora rounded-full bg-magenta/25 mix-blend-screen blur-[140px] [animation-delay:-6s]" />
        <div className="absolute top-1/3 right-1/4 size-[30vw] animate-aurora rounded-full bg-signal/20 mix-blend-screen blur-[120px] [animation-delay:-12s]" />
      </div>

      <div
        ref={contentRef}
        className="relative mx-auto w-full max-w-[1440px] px-5 pt-32 pb-16 will-change-transform sm:px-8 sm:pb-20 lg:px-12 lg:pb-24"
      >
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mb-8 flex items-center gap-4"
        >
          <Equalizer bars={10} className="h-6" />
          <p className="text-xs font-medium tracking-[0.32em] text-ink/80 uppercase">Artist booking · India & beyond</p>
        </motion.div>

        <h1
          id="hero-title"
          className="max-w-[17ch] font-display text-[clamp(2.6rem,6.6vw,6.75rem)] leading-[0.95] font-bold tracking-[-0.03em] text-ink"
        >
          <span className="sr-only">{siteConfig.tagline}</span>
          <span aria-hidden="true">
            {words.map((word, i) => (
              <span key={word} className="mr-[0.22em] inline-block overflow-hidden pb-[0.06em] align-bottom last:mr-0">
                <motion.span
                  className={`inline-block ${i >= 4 ? "text-gradient" : ""}`}
                  initial={reduce ? false : { y: "105%", rotate: 4 }}
                  animate={{ y: "0%", rotate: 0 }}
                  transition={{ duration: 1.1, delay: 0.15 + i * 0.08, ease: EASE }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </span>
        </h1>

        <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.8, ease: EASE }}
            className="max-w-xl"
          >
            <p className="text-lg leading-relaxed text-ink/80 sm:text-xl">
              Singers, DJs, live bands, dancers and headline acts — curated, negotiated and managed end to end for
              weddings, corporate nights, festivals and private celebrations.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Magnetic>
                <Cta href="/artists" size="lg">
                  Explore artists <ArrowUpRight />
                </Cta>
              </Magnetic>
              <Cta href="/book-an-artist" size="lg" variant="ghost">
                Book an artist
              </Cta>
            </div>
          </motion.div>

          <motion.dl
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.1 }}
            className="grid grid-cols-3 gap-6 border-t border-white/15 pt-6 sm:gap-10 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10"
          >
            {[
              { value: stats.artists, label: "Artists on the roster" },
              { value: stats.categories, label: "Performance categories" },
              { value: stats.cities, label: "Home cities" },
            ].map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-3xl font-semibold text-ink sm:text-4xl">{s.value}</dd>
                <dd className="mt-1 max-w-[10ch] text-xs leading-snug text-haze">{s.label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <div className="mt-14 flex items-center justify-between">
          <a
            href="#featured-artists"
            className="focus-ring group inline-flex items-center gap-3 rounded-full text-xs tracking-[0.28em] text-ink/70 uppercase hover:text-ink"
          >
            <span className="relative flex h-11 w-7 justify-center rounded-full border border-white/30 pt-2">
              <motion.span
                className="block size-1.5 rounded-full bg-ink"
                animate={reduce ? undefined : { y: [0, 14, 0], opacity: [1, 0.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </span>
            Scroll to explore
            <ArrowDown className="size-3.5 transition-transform group-hover:translate-y-0.5" />
          </a>
          {slide && (
            <p className="hidden text-xs tracking-[0.2em] text-ink/60 uppercase sm:block" aria-live="off">
              {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")} — {slide.caption}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
