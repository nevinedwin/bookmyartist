import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check } from "lucide-react";
import { ArtistCard } from "@/components/stage/artist-card";
import { Cta } from "@/components/stage/cta";
import { JsonLd } from "@/components/stage/json-ld";
import { Magnetic } from "@/components/stage/magnetic";
import { PageHero } from "@/components/stage/page-hero";
import { ImageReveal, Reveal } from "@/components/stage/reveal";
import { siteConfig } from "@/config/site";
import { getService, SERVICES } from "@/content/services";
import { getArtistsForEventType } from "@/server/services/public/catalogue";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const service = getService((await params).slug);
  if (!service) return { title: "Service not found", robots: { index: false } };
  return {
    title: `${service.name} entertainment`,
    description: service.intro,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: { title: `${service.name} entertainment · ${siteConfig.name}`, description: service.intro, images: [{ url: `${service.heroImage}?w=1200&h=630&fit=crop&q=75` }] },
  };
}

export default async function ServicePage({ params }: PageProps<"/services/[slug]">) {
  const service = getService((await params).slug);
  if (!service) notFound();
  const artists = await getArtistsForEventType(service.eventType, 6);
  const enquire = `/book-an-artist?service=${service.slug}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: `${service.name} entertainment`,
          serviceType: "Artist booking",
          description: service.intro,
          areaServed: { "@type": "Country", name: "India" },
          provider: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
        }}
      />
      {service.faqs.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: service.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          }}
        />
      )}
      <PageHero eyebrow={service.kicker} title={service.headline} image={service.heroImage}>
        {service.intro}
        <div className="mt-8 flex flex-wrap gap-4">
          <Magnetic>
            <Cta href={enquire} size="lg">
              Enquire for your {service.name.toLowerCase().replace(/s$/, "")} <ArrowUpRight />
            </Cta>
          </Magnetic>
        </div>
      </PageHero>

      <section className="mx-auto grid max-w-[1440px] gap-14 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:px-12 lg:py-24">
        <Reveal className="space-y-6 text-lg leading-relaxed text-haze lg:col-span-6">
          {service.body.map((p, i) => (
            <p key={i} className={i === 0 ? "text-xl leading-relaxed font-medium text-ink sm:text-2xl" : undefined}>
              {p}
            </p>
          ))}
        </Reveal>
        <ul className="grid gap-4 lg:col-span-5 lg:col-start-8">
          {service.highlights.map((h, i) => (
            <li key={h.title}>
              <Reveal delay={i * 0.08} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-electric to-magenta">
                  <Check className="size-4 text-white" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink">{h.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-haze">{h.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {service.gallery.length > 0 && (
        <section aria-label={`${service.name} moments`} className="mx-auto grid max-w-[1440px] gap-4 px-5 sm:grid-cols-3 sm:px-8 lg:px-12">
          {service.gallery.map((src, i) => (
            <ImageReveal key={src} delay={i * 0.08} className={i === 1 ? "sm:mt-16" : undefined}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
                <Image src={src} alt="" fill sizes="(min-width:640px) 33vw, 100vw" className="object-cover" />
              </div>
            </ImageReveal>
          ))}
        </section>
      )}

      {artists.length > 0 && (
        <section aria-labelledby="suggested" className="py-24 sm:py-28">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
            <h2 id="suggested" className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
              Artists we suggest for {service.name.toLowerCase()}
            </h2>
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {artists.map((a) => (
                <li key={a.id}>
                  <ArtistCard artist={a} className="h-full" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {service.faqs.length > 0 && (
        <section aria-labelledby="faqs" className="mx-auto max-w-4xl px-5 pb-24 sm:px-8">
          <h2 id="faqs" className="font-display text-3xl font-semibold text-ink">Questions we hear often</h2>
          <dl className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {service.faqs.map((f) => (
              <div key={f.q} className="py-6">
                <dt className="font-medium text-ink">{f.q}</dt>
                <dd className="mt-2 text-haze">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="px-5 pb-24 text-center sm:px-8">
        <p className="mx-auto max-w-3xl font-display text-3xl font-semibold text-ink sm:text-5xl">Tell us the date. We&apos;ll bring the sound.</p>
        <Cta href={enquire} size="lg" className="mt-10">
          Start an enquiry <ArrowUpRight />
        </Cta>
      </section>
    </>
  );
}
