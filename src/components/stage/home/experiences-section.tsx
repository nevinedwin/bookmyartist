import Image from "next/image";
import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";
import { EXPERIENCES } from "@/content/experiences";
import { cn } from "@/lib/utils";
import { ImageReveal, Reveal } from "../reveal";
import { SectionHeading } from "../section-heading";

export function ExperiencesSection() {
  const featured = EXPERIENCES.slice(0, 3);
  return (
    <section aria-labelledby="experiences-title" className="relative overflow-hidden py-24 sm:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute top-1/3 -left-40 size-[36rem] rounded-full bg-electric/15 blur-[140px]" />
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <SectionHeading index="04" eyebrow="Curated experiences" title="Ready-made nights, tuned to your crowd." id="experiences-title">
          Start from a format we&apos;ve refined across hundreds of evenings — then make it yours.
        </SectionHeading>

        <div className="mt-16 grid gap-6 md:grid-cols-3 md:gap-8">
          {featured.map((e, i) => (
            <article key={e.slug} className={cn("group", i === 1 && "md:mt-24", i === 2 && "md:mt-12")}>
              <ImageReveal delay={i * 0.1}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-3xl">
                  <Image
                    src={e.image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-[1.4s] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight-950/90 via-transparent to-transparent" />
                  <p className="absolute top-5 left-5 inline-flex items-center gap-1.5 rounded-full bg-midnight-950/60 px-3 py-1 text-xs text-ink backdrop-blur">
                    <Sparkles className="size-3.5 text-magenta" aria-hidden="true" /> {e.mood}
                  </p>
                </div>
              </ImageReveal>
              <Reveal delay={0.15 + i * 0.1} className="mt-6">
                <h3 className="font-display text-2xl font-semibold tracking-tight text-ink">{e.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-haze">{e.description}</p>
                <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink/70">
                  <Clock className="size-3.5" aria-hidden="true" /> {e.duration}
                </p>
                <div className="mt-5">
                  <Link
                    href={`/book-an-artist?experience=${e.slug}&category=${e.categorySlug}&event=${e.eventTypes[0] ?? ""}`}
                    className="focus-ring inline-flex items-center gap-2 rounded-full border-b border-transparent text-sm font-medium text-violet-glow hover:text-ink"
                  >
                    Plan this experience →
                  </Link>
                </div>
              </Reveal>
            </article>
          ))}
        </div>
        <Reveal className="mt-16 flex justify-center">
          <Link href="/experiences" className="focus-ring rounded-full border border-white/20 px-7 py-3 text-sm font-medium text-ink hover:border-white/40 hover:bg-white/5">
            See all experiences
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
