import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/stage/page-hero";
import { ImageReveal, Reveal } from "@/components/stage/reveal";
import { IMAGES } from "@/content/images";
import { SERVICES } from "@/content/services";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Services",
  description: "Entertainment for weddings, corporate events, college festivals, private parties, concerts, cultural programmes, festivals and brand activations.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHero eyebrow="Services" title="Built around the occasion." image={IMAGES.stageRig}>
        Each kind of event has its own rhythm. We plan entertainment around it — line-up, logistics and paperwork included.
      </PageHero>
      <section aria-label="Services" className="mx-auto max-w-[1440px] space-y-24 px-5 pb-28 sm:px-8 lg:space-y-32 lg:px-12">
        {SERVICES.map((s, i) => (
          <article key={s.slug} className="grid items-center gap-10 lg:grid-cols-12">
            <ImageReveal className={cn("lg:col-span-7", i % 2 === 1 && "lg:order-2 lg:col-start-6")}>
              <Link href={`/services/${s.slug}`} className="focus-ring group relative block aspect-[16/10] overflow-hidden rounded-3xl" tabIndex={-1} aria-hidden="true">
                <Image src={s.heroImage} alt="" fill sizes="(min-width:1024px) 58vw, 100vw" className="object-cover transition-transform duration-[1.4s] group-hover:scale-105" />
              </Link>
            </ImageReveal>
            <Reveal className={cn("lg:col-span-5", i % 2 === 1 ? "lg:order-1 lg:col-span-4 lg:col-start-1" : "lg:pl-6")}>
              <p className="font-display text-sm text-ink/40">{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-3 text-xs tracking-[0.28em] text-violet-glow uppercase">{s.kicker}</p>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{s.name}</h2>
              <p className="mt-5 text-lg leading-relaxed text-haze">{s.intro}</p>
              <Link href={`/services/${s.slug}`} className="focus-ring mt-8 inline-flex items-center gap-2 rounded-full text-sm font-medium text-ink hover:text-violet-glow">
                Explore {s.name.toLowerCase()} <ArrowUpRight className="size-4" />
              </Link>
            </Reveal>
          </article>
        ))}
      </section>
    </>
  );
}
