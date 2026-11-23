import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ArtistCard } from "@/components/stage/artist-card";
import { CategoriesSection } from "@/components/stage/home/categories-section";
import { ContactSection } from "@/components/stage/home/contact-section";
import { CtaSection } from "@/components/stage/home/cta-section";
import { ExperiencesSection } from "@/components/stage/home/experiences-section";
import { FeaturedRail } from "@/components/stage/home/featured-rail";
import { GallerySection } from "@/components/stage/home/gallery-section";
import { Hero } from "@/components/stage/home/hero";
import { ProcessSection } from "@/components/stage/home/process-section";
import { ServicesList } from "@/components/stage/home/services-section";
import { Testimonials } from "@/components/stage/home/testimonials";
import { WhySection } from "@/components/stage/home/why-section";
import { JsonLd } from "@/components/stage/json-ld";
import { Marquee } from "@/components/stage/marquee";
import { SectionHeading } from "@/components/stage/section-heading";
import { siteConfig } from "@/config/site";
import { IMAGES } from "@/content/images";
import { SERVICES } from "@/content/services";
import {
  getCatalogueStats,
  getCategories,
  getFeaturedArtists,
  getShowcase,
  getTestimonials,
} from "@/server/services/public/catalogue";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const HERO_SLIDES = [
  { src: IMAGES.heroFestivalViolet, alt: "Crowd under violet stage lights at a music festival", caption: "Festival nights" },
  { src: IMAGES.heroCrowdGold, alt: "Concert crowd silhouetted against golden stage lights", caption: "Live concerts" },
  { src: IMAGES.danceFloor, alt: "Guests dancing at a celebration", caption: "Celebrations" },
  { src: IMAGES.heroLightBeams, alt: "Light beams sweeping over a cheering audience", caption: "Headline moments" },
];

export default async function HomePage() {
  const [stats, featured, categories, showcase, testimonials] = await Promise.all([
    getCatalogueStats(),
    getFeaturedArtists(8),
    getCategories(),
    getShowcase(6),
    getTestimonials(6),
  ]);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: siteConfig.name,
          legalName: siteConfig.legalName,
          url: siteConfig.url,
          description: siteConfig.description,
          slogan: siteConfig.tagline,
          ...(siteConfig.contact.email ? { email: siteConfig.contact.email } : {}),
          ...(siteConfig.contact.phone ? { telephone: siteConfig.contact.phone } : {}),
        }}
      />
      <Hero slides={HERO_SLIDES} stats={stats} />

      <div className="border-y border-white/10 bg-midnight-900 py-6 font-display text-2xl font-semibold tracking-tight text-ink/90 sm:text-3xl">
        <Marquee items={["Weddings", "Corporate galas", "College pro-nights", "Private parties", "Concerts", "Festivals", "Brand launches", "Cultural evenings"]} />
      </div>

      {featured.length > 0 && (
        <section id="featured-artists" aria-labelledby="featured-title" className="relative scroll-mt-20">
          <FeaturedRail
            header={
              <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
                <SectionHeading index="01" eyebrow="Featured artists" title="Voices and sounds people remember." id="featured-title" />
                <Link href="/artists" className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full text-sm font-medium text-ink hover:text-violet-glow">
                  View all artists <ArrowUpRight className="size-4" />
                </Link>
              </div>
            }
          >
            {featured.map((artist, i) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                priority={i < 2}
                sizes="(min-width: 1024px) 380px, 80vw"
                className="w-[80vw] shrink-0 snap-start sm:w-[360px] lg:w-[380px]"
              />
            ))}
          </FeaturedRail>
        </section>
      )}

      <CategoriesSection categories={categories} />

      <section aria-labelledby="services-title" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <SectionHeading index="03" eyebrow="Our services" title="Every kind of celebration, covered." id="services-title" />
          <ServicesList services={SERVICES.map(({ slug, name, kicker, intro, heroImage }) => ({ slug, name, kicker, intro, heroImage }))} />
        </div>
      </section>

      <ExperiencesSection />
      <WhySection />
      <ProcessSection />
      <GallerySection items={showcase} />

      {testimonials.length > 0 && (
        <section aria-labelledby="testimonials-title" className="relative overflow-hidden py-24 sm:py-32">
          <div aria-hidden="true" className="pointer-events-none absolute top-0 right-0 size-[30rem] rounded-full bg-electric/15 blur-[140px]" />
          <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
            <SectionHeading index="08" eyebrow="Kind words" title="Heard after the last song." id="testimonials-title" />
            <Testimonials items={testimonials} />
          </div>
        </section>
      )}

      <CtaSection />
      <ContactSection />
    </>
  );
}
