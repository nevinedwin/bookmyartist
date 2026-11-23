import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Cta } from "@/components/stage/cta";
import { WhySection } from "@/components/stage/home/why-section";
import { ProcessSection } from "@/components/stage/home/process-section";
import { PageHero } from "@/components/stage/page-hero";
import { ImageReveal, Reveal } from "@/components/stage/reveal";
import { siteConfig } from "@/config/site";
import { IMAGES } from "@/content/images";
import { getCatalogueStats } from "@/server/services/public/catalogue";

export const metadata: Metadata = {
  title: "About",
  description: `${siteConfig.name} is an artist booking and entertainment management agency connecting hosts with the right performers.`,
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const stats = await getCatalogueStats();
  return (
    <>
      <PageHero eyebrow="About us" title="We book the moment people talk about afterwards." image={IMAGES.crowdHands}>
        {siteConfig.name} sits between hosts and artists. We find the right act, agree the details, manage the money and make sure the show happens exactly as promised.
      </PageHero>

      <section className="mx-auto grid max-w-[1440px] items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-24">
        <ImageReveal>
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
            <Image src={IMAGES.bandStage} alt="A live band performing on stage" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          </div>
        </ImageReveal>
        <Reveal className="space-y-6 text-lg leading-relaxed text-haze">
          <p className="font-display text-3xl leading-tight font-semibold text-ink">An agency that thinks like a producer.</p>
          <p>
            Booking an artist is more than a phone number. It&apos;s availability, fair fees, travel, riders, sound checks, timings, contracts,
            advances and settlements — and someone accountable when plans change.
          </p>
          <p>
            We represent a curated roster and work with a wider network of performers. For every enquiry we recommend options honestly,
            negotiate on your behalf and stay with you until the last song.
          </p>
          <dl className="grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {[
              { v: stats.artists, l: "Artists on roster" },
              { v: stats.categories, l: "Categories" },
              { v: stats.cities, l: "Home cities" },
            ].map((s) => (
              <div key={s.l}>
                <dt className="text-xs text-haze">{s.l}</dt>
                <dd className="mt-1 font-display text-4xl font-semibold text-ink">{s.v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      <WhySection index="" />
      <ProcessSection index="" />

      <section className="px-5 py-24 text-center sm:px-8">
        <p className="mx-auto max-w-3xl font-display text-3xl font-semibold text-ink sm:text-5xl">Have an event in mind?</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Cta href="/book-an-artist" size="lg">
            Start an enquiry <ArrowUpRight />
          </Cta>
          <Cta href="/contact" size="lg" variant="ghost">
            Contact us
          </Cta>
        </div>
      </section>
    </>
  );
}
