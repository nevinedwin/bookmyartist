import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal, WordsReveal } from "./reveal";

/** Hero band for inner pages: eyebrow, oversized title, optional image wash. */
export function PageHero({
  eyebrow,
  title,
  children,
  image,
  className,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  image?: string;
  className?: string;
}) {
  return (
    <section className={cn("grain relative isolate overflow-hidden pt-36 pb-16 sm:pt-44 sm:pb-20", className)}>
      {image && (
        <>
          <Image src={image} alt="" fill preload sizes="100vw" className="-z-20 object-cover opacity-40" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-midnight-950/60 via-midnight-950/80 to-midnight-950" />
        </>
      )}
      <div aria-hidden="true" className="absolute -top-40 -left-40 -z-10 size-[36rem] animate-aurora rounded-full bg-electric/25 blur-[140px]" />
      <div aria-hidden="true" className="absolute -top-20 right-0 -z-10 size-[28rem] animate-aurora rounded-full bg-magenta/15 blur-[140px] [animation-delay:-8s]" />
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <p className="flex items-center gap-3 text-xs font-medium tracking-[0.3em] text-violet-glow uppercase">
          <span className="h-px w-8 bg-gradient-to-r from-electric to-magenta" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="mt-6 max-w-5xl font-display text-[clamp(2.6rem,7vw,6.5rem)] leading-[0.95] font-bold tracking-[-0.03em] text-ink">
          <WordsReveal text={title} />
        </h1>
        {children && (
          <Reveal delay={0.25} className="mt-8 max-w-2xl text-lg leading-relaxed text-haze">
            {children}
          </Reveal>
        )}
      </div>
    </section>
  );
}
