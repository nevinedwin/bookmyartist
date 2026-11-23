import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock, Music2 } from "lucide-react";
import { PageHero } from "@/components/stage/page-hero";
import { ImageReveal, Reveal } from "@/components/stage/reveal";
import { EXPERIENCES } from "@/content/experiences";
import { IMAGES } from "@/content/images";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Curated experiences",
  description: "Ready-made entertainment formats — sangeet nights, Sufi evenings, club sets, corporate galas and more — tailored to your event.",
  alternates: { canonical: "/experiences" },
};

export default function ExperiencesPage() {
  return (
    <>
      <PageHero eyebrow="Curated experiences" title="Formats that already work. Made yours." image={IMAGES.confettiStage}>
        Start from a line-up we&apos;ve refined over many evenings. We tune the artists, set length and production to your venue and crowd.
      </PageHero>
      <section aria-label="Experiences" className="mx-auto max-w-[1440px] px-5 pb-28 sm:px-8 lg:px-12">
        <ul className="grid gap-x-8 gap-y-20 md:grid-cols-2">
          {EXPERIENCES.map((e, i) => (
            <li key={e.slug} className={cn(i % 2 === 1 && "md:mt-28")}>
              <article className="group">
                <ImageReveal>
                  <div className="relative aspect-[5/4] overflow-hidden rounded-3xl">
                    <Image src={e.image} alt="" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition-transform duration-[1.4s] group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-midnight-950/80 via-transparent" />
                    <ul className="absolute bottom-5 left-5 flex flex-wrap gap-2">
                      {e.eventTypes.map((t) => (
                        <li key={t} className="rounded-full bg-midnight-950/60 px-3 py-1 text-xs text-ink backdrop-blur">
                          {EVENT_TYPE_LABELS[t]}
                        </li>
                      ))}
                    </ul>
                  </div>
                </ImageReveal>
                <Reveal className="mt-7">
                  <p className="text-xs tracking-[0.24em] text-violet-glow uppercase">{e.mood}</p>
                  <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">{e.name}</h2>
                  <p className="mt-4 leading-relaxed text-haze">{e.description}</p>
                  <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink/85">
                    <span className="inline-flex items-center gap-2">
                      <Clock className="size-4 text-violet-glow" aria-hidden="true" /> {e.duration}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Music2 className="size-4 text-violet-glow" aria-hidden="true" /> {e.lineup.join(" · ")}
                    </span>
                  </div>
                  <Link
                    href={`/book-an-artist?experience=${e.slug}&category=${e.categorySlug}&event=${e.eventTypes[0] ?? ""}`}
                    className="focus-ring mt-8 inline-flex items-center gap-2 rounded-full bg-white/5 px-6 py-3 text-sm font-medium text-ink ring-1 ring-white/15 transition hover:bg-white/10"
                  >
                    Plan this experience <ArrowUpRight className="size-4" />
                  </Link>
                </Reveal>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
