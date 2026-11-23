import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BadgeCheck, Clock, Languages, MapPin, Mic2, Users, Wrench } from "lucide-react";
import { ArtistCard } from "@/components/stage/artist-card";
import { Cta } from "@/components/stage/cta";
import { JsonLd } from "@/components/stage/json-ld";
import { Magnetic } from "@/components/stage/magnetic";
import { MediaGallery } from "@/components/stage/media-gallery";
import { Reveal } from "@/components/stage/reveal";
import { VideoEmbed } from "@/components/stage/video-embed";
import { siteConfig } from "@/config/site";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { formatINR } from "@/lib/money";
import {
  getAllArtistSlugs,
  getArtistProfile,
  getRelatedArtists,
  type PublicArtistProfile,
} from "@/server/services/public/catalogue";

export async function generateStaticParams() {
  const slugs = await getAllArtistSlugs();
  // Cache Components requires at least one param to validate the route at build time.
  return slugs.length > 0 ? slugs.map(({ slug }) => ({ slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/artists/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistProfile(slug);
  if (!artist) return { title: "Artist not found", robots: { index: false } };
  const title = artist.seoTitle ?? `${artist.stageName} — ${artist.category.name} for events in ${artist.baseCity}`;
  const description = artist.seoDescription ?? artist.shortBio;
  const image = artist.coverUrl ?? artist.imageUrl;
  return {
    title,
    description,
    alternates: { canonical: `/artists/${artist.slug}` },
    openGraph: {
      type: "profile",
      title: `${artist.stageName} · ${siteConfig.name}`,
      description,
      url: `/artists/${artist.slug}`,
      images: image ? [{ url: `${image}${image.includes("?") ? "&" : "?"}w=1200&h=630&fit=crop&q=75` }] : undefined,
    },
  };
}

function durationLabel(a: PublicArtistProfile): string | null {
  const fmt = (m: number) => (m >= 60 ? `${+(m / 60).toFixed(1)} hr` : `${m} min`);
  if (a.minDurationMinutes && a.maxDurationMinutes) return `${fmt(a.minDurationMinutes)} – ${fmt(a.maxDurationMinutes)}`;
  if (a.maxDurationMinutes) return `Up to ${fmt(a.maxDurationMinutes)}`;
  if (a.minDurationMinutes) return `From ${fmt(a.minDurationMinutes)}`;
  return null;
}

export default async function ArtistPage({ params }: PageProps<"/artists/[slug]">) {
  const { slug } = await params;
  const artist = await getArtistProfile(slug);
  if (!artist) notFound();

  const related = await getRelatedArtists(artist.slug, artist.category.slug, 3);
  const images = artist.media.filter((m) => m.type === "IMAGE");
  const videos = artist.media.filter((m) => m.type === "VIDEO");
  const audio = artist.media.filter((m) => m.type === "AUDIO");
  const hero = artist.coverUrl ?? artist.imageUrl;
  const enquireHref = `/book-an-artist?artist=${artist.slug}`;
  const duration = durationLabel(artist);

  const facts = [
    { icon: MapPin, label: "Based in", value: artist.baseCity },
    artist.languages.length > 0 && { icon: Languages, label: "Languages", value: artist.languages.join(", ") },
    artist.teamSize && { icon: Users, label: "Team size", value: `${artist.teamSize} ${artist.teamSize === 1 ? "performer" : "people"}` },
    duration && { icon: Clock, label: "Set length", value: duration },
  ].filter(Boolean) as { icon: typeof MapPin; label: string; value: string }[];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": (artist.teamSize ?? 1) > 1 ? "PerformingGroup" : "Person",
          name: artist.stageName,
          description: artist.shortBio,
          url: `${siteConfig.url}/artists/${artist.slug}`,
          ...(artist.imageUrl ? { image: artist.imageUrl } : {}),
          ...((artist.teamSize ?? 1) > 1
            ? { location: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: artist.baseCity, addressCountry: "IN" } } }
            : { homeLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: artist.baseCity, addressCountry: "IN" } } }),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Artists", item: `${siteConfig.url}/artists` },
            { "@type": "ListItem", position: 2, name: artist.stageName, item: `${siteConfig.url}/artists/${artist.slug}` },
          ],
        }}
      />

      {/* Cover */}
      <section className="grain relative isolate flex min-h-[88svh] items-end overflow-hidden">
        {hero && <Image src={hero} alt="" fill preload sizes="100vw" className="-z-20 object-cover" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-midnight-950 via-midnight-950/60 to-midnight-950/20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-midnight-950/90 via-midnight-950/30 to-transparent" />
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 pt-36 pb-14 sm:px-8 lg:grid-cols-12 lg:items-end lg:px-12 lg:pb-20">
          <div className="lg:col-span-8">
            <Link href="/artists" className="focus-ring inline-flex items-center gap-2 rounded-full text-sm text-ink/80 hover:text-ink">
              <ArrowLeft className="size-4" /> All artists
            </Link>
            <p className="mt-8 flex flex-wrap items-center gap-3 text-xs font-medium tracking-[0.28em] text-violet-glow uppercase">
              <Link href={`/artists?category=${artist.category.slug}`} className="focus-ring rounded hover:text-ink">
                {artist.category.name}
              </Link>
              {artist.isFeatured && <span className="rounded-full bg-magenta/90 px-2.5 py-0.5 tracking-normal text-white normal-case">Featured</span>}
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.8rem,8vw,7.5rem)] leading-[0.92] font-bold tracking-[-0.03em] text-ink">
              {artist.stageName}
            </h1>
            {artist.tagline && <p className="mt-5 text-xl text-ink/80 sm:text-2xl">{artist.tagline}</p>}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink/80">
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4 text-violet-glow" /> {artist.baseCity}
              </span>
              {artist.languages.length > 0 && (
                <span className="inline-flex items-center gap-2">
                  <Languages className="size-4 text-violet-glow" /> {artist.languages.join(" · ")}
                </span>
              )}
              {artist.availabilityVerified && (
                <span className="inline-flex items-center gap-2 text-emerald-300">
                  <BadgeCheck className="size-4" /> Availability recently verified
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start gap-4 lg:col-span-4 lg:items-end">
            {artist.priceFromPaise && (
              <p className="text-right">
                <span className="block text-xs tracking-[0.2em] text-haze uppercase">Starting from</span>
                <span className="font-display text-4xl font-semibold text-ink">{formatINR(artist.priceFromPaise)}</span>
              </p>
            )}
            <Magnetic>
              <Cta href={enquireHref} size="lg">
                Enquire about {artist.stageName.split(" ")[0]} <ArrowUpRight />
              </Cta>
            </Magnetic>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1440px] gap-16 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:px-12 lg:py-28">
        {/* Main column */}
        <div className="space-y-20 lg:col-span-8">
          <Reveal>
            <section aria-labelledby="about-artist">
              <h2 id="about-artist" className="text-xs font-medium tracking-[0.3em] text-violet-glow uppercase">
                About
              </h2>
              <p className="mt-6 font-display text-2xl leading-snug font-medium text-ink sm:text-3xl">{artist.shortBio}</p>
              <div className="mt-8 space-y-5 text-lg leading-relaxed text-haze">
                {artist.biography.split(/\n{2,}/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          </Reveal>

          {artist.performanceDescription && (
            <Reveal>
              <section aria-labelledby="performance" className="rounded-3xl border border-white/10 bg-gradient-to-br from-electric/10 via-transparent to-magenta/10 p-8 sm:p-10">
                <h2 id="performance" className="flex items-center gap-3 font-display text-2xl font-semibold text-ink">
                  <Mic2 className="size-6 text-magenta" /> The performance
                </h2>
                <p className="mt-4 leading-relaxed text-ink/85">{artist.performanceDescription}</p>
                {artist.performanceTypes.length > 0 && (
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {artist.performanceTypes.map((t) => (
                      <li key={t} className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-ink">
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </Reveal>
          )}

          {images.length > 0 && (
            <section aria-labelledby="photos">
              <h2 id="photos" className="text-xs font-medium tracking-[0.3em] text-violet-glow uppercase">
                Photos
              </h2>
              <div className="mt-6">
                <MediaGallery images={images.map((m) => ({ id: m.id, url: m.url, alt: m.alt ?? `${artist.stageName} performing` }))} />
              </div>
            </section>
          )}

          {videos.length > 0 && (
            <section aria-labelledby="videos">
              <h2 id="videos" className="text-xs font-medium tracking-[0.3em] text-violet-glow uppercase">
                Performance videos
              </h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {videos.map((v) => (
                  <VideoEmbed
                    key={v.id}
                    provider={v.provider}
                    videoId={v.providerId}
                    url={v.url}
                    title={v.title ?? `${artist.stageName} live`}
                    thumbnailUrl={v.thumbnailUrl}
                  />
                ))}
              </div>
            </section>
          )}

          {audio.length > 0 && (
            <section aria-labelledby="audio">
              <h2 id="audio" className="text-xs font-medium tracking-[0.3em] text-violet-glow uppercase">
                Listen
              </h2>
              <ul className="mt-6 space-y-4">
                {audio.map((a) => (
                  <li key={a.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="mb-3 text-sm font-medium text-ink">{a.title ?? "Audio sample"}</p>
                    <audio controls preload="none" src={a.url} className="w-full">
                      Your browser does not support audio playback.
                    </audio>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4">
          <div className="space-y-6 lg:sticky lg:top-28">
            <div className="rounded-3xl border border-white/10 bg-midnight-900 p-7">
              <h2 className="font-display text-lg font-semibold text-ink">At a glance</h2>
              <dl className="mt-6 space-y-5">
                {facts.map((f) => (
                  <div key={f.label} className="flex gap-4">
                    <f.icon className="mt-0.5 size-5 shrink-0 text-violet-glow" aria-hidden="true" />
                    <div>
                      <dt className="text-xs tracking-[0.16em] text-haze uppercase">{f.label}</dt>
                      <dd className="mt-1 text-ink">{f.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              {artist.eventTypes.length > 0 && (
                <div className="mt-7 border-t border-white/10 pt-6">
                  <h3 className="text-xs tracking-[0.16em] text-haze uppercase">Perfect for</h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {artist.eventTypes.map((e) => (
                      <li key={e} className="rounded-full bg-white/5 px-3 py-1 text-xs text-ink">
                        {EVENT_TYPE_LABELS[e]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {artist.technicalRequirements && (
                <div className="mt-7 border-t border-white/10 pt-6">
                  <h3 className="flex items-center gap-2 text-xs tracking-[0.16em] text-haze uppercase">
                    <Wrench className="size-3.5" aria-hidden="true" /> Technical requirements
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/85">{artist.technicalRequirements}</p>
                </div>
              )}
              {artist.publicContact && (artist.publicContact.email || artist.publicContact.phone) && (
                <div className="mt-7 border-t border-white/10 pt-6 text-sm">
                  <h3 className="text-xs tracking-[0.16em] text-haze uppercase">Public contact</h3>
                  {artist.publicContact.email && <p className="mt-2 text-ink">{artist.publicContact.email}</p>}
                  {artist.publicContact.phone && <p className="mt-1 text-ink">{artist.publicContact.phone}</p>}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-electric to-magenta p-7 text-white">
              {artist.priceFromPaise ? (
                <>
                  <p className="text-xs tracking-[0.2em] uppercase opacity-80">Starting from</p>
                  <p className="mt-1 font-display text-3xl font-semibold">{formatINR(artist.priceFromPaise)}</p>
                  {artist.priceNote && <p className="mt-2 text-sm opacity-85">{artist.priceNote}</p>}
                </>
              ) : (
                <>
                  <p className="font-display text-xl font-semibold">Pricing on request</p>
                  <p className="mt-2 text-sm opacity-85">Fees depend on date, city, set length and line-up. We&apos;ll send a formal quotation.</p>
                </>
              )}
              <Link
                href={enquireHref}
                className="mt-6 flex items-center justify-between rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-midnight-950 outline-none transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-magenta"
              >
                Check availability <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related" className="border-t border-white/10 py-20 sm:py-28">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
            <h2 id="related" className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              More {artist.category.name.toLowerCase()}
            </h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.id}>
                  <ArtistCard artist={r} className="h-full" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
