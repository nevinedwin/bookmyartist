import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { IMAGES } from "@/content/images";
import { Cta } from "../cta";
import { Magnetic } from "../magnetic";
import { Reveal, WordsReveal } from "../reveal";

export function CtaSection() {
  return (
    <section aria-labelledby="cta-title" className="px-3 py-10 sm:px-6">
      <div className="grain relative isolate overflow-hidden rounded-[2.5rem] px-6 py-24 sm:px-12 sm:py-32 lg:py-40">
        <Image src={IMAGES.crowdHearts} alt="" fill sizes="100vw" className="-z-20 object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-electric/85 via-midnight-950/70 to-magenta/70" />
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-medium tracking-[0.32em] text-ink/80 uppercase">Your date is someone else&apos;s too</p>
          <h2 id="cta-title" className="mt-6 font-display text-[clamp(2.4rem,7vw,6.5rem)] leading-[0.95] font-bold tracking-[-0.03em] text-ink">
            <WordsReveal text="Lock in the line-up before the season does." />
          </h2>
          <Reveal delay={0.3} className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Magnetic>
              <Cta href="/book-an-artist" size="lg" variant="light">
                Book an artist <ArrowUpRight />
              </Cta>
            </Magnetic>
            <Cta href="/artists" size="lg" variant="ghost">
              Browse the roster
            </Cta>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
