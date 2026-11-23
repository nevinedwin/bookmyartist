import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArtistCard } from "@/components/stage/artist-card";
import { ArtistFilters } from "@/components/stage/artist-filters";
import { Cta } from "@/components/stage/cta";
import { PageHero } from "@/components/stage/page-hero";
import { IMAGES } from "@/content/images";
import { artistSearchParamsSchema } from "@/lib/validation/artist-filters";
import { getArtistFacets, getCategories, searchArtists } from "@/server/services/public/catalogue";

export const metadata: Metadata = {
  title: "Artists",
  description: "Browse singers, DJs, live bands, instrumentalists, dancers, emcees and comedians available for events across India.",
  alternates: { canonical: "/artists" },
};

export default function ArtistsPage({ searchParams }: PageProps<"/artists">) {
  return (
    <>
      <PageHero eyebrow="The roster" title="Find your headliner." image={IMAGES.heroStageBlue}>
        Filter by sound, city and occasion. Every profile is curated by our team — enquire and we&apos;ll confirm real availability.
      </PageHero>
      <section aria-label="Artist directory" className="mx-auto max-w-[1440px] px-5 pb-28 sm:px-8 lg:px-12">
        <Suspense fallback={<FiltersSkeleton />}>
          <Filters />
        </Suspense>
        <Suspense fallback={<ResultsSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </section>
    </>
  );
}

async function Filters() {
  const [categories, facets] = await Promise.all([getCategories(), getArtistFacets()]);
  return (
    <ArtistFilters
      categories={categories.filter((c) => c.artistCount > 0).map((c) => ({ value: c.slug, label: c.name }))}
      cities={facets.cities}
      performanceTypes={facets.performanceTypes}
    />
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/artists">["searchParams"] }) {
  const parsed = artistSearchParamsSchema.parse(await searchParams);
  const result = await searchArtists({
    q: parsed.q,
    category: parsed.category,
    city: parsed.city,
    eventType: parsed.event,
    performanceType: parsed.type,
    budget: parsed.budget,
    availableOnly: parsed.available === "1",
    page: parsed.page,
  });

  const pageHref = (page: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(parsed)) if (v !== undefined && k !== "page") qs.set(k, String(v));
    if (page > 1) qs.set("page", String(page));
    const s = qs.toString();
    return s ? `/artists?${s}` : "/artists";
  };

  if (result.total === 0) {
    return (
      <div className="mt-16 rounded-3xl border border-dashed border-white/15 px-6 py-20 text-center">
        <p className="font-display text-2xl font-semibold text-ink">No artists match those filters.</p>
        <p className="mx-auto mt-3 max-w-md text-haze">
          Try removing a filter — or tell us what you&apos;re looking for and we&apos;ll find the right act from our wider network.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Cta href="/artists" variant="ghost">
            Reset filters
          </Cta>
          <Cta href="/book-an-artist">Ask our team</Cta>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <p className="text-sm text-haze" aria-live="polite">
        {result.total} {result.total === 1 ? "artist" : "artists"}
        {parsed.budget && " with published pricing"}
      </p>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {result.artists.map((artist, i) => (
          <li key={artist.id}>
            <ArtistCard artist={artist} priority={i < 4} className="h-full" />
          </li>
        ))}
      </ul>
      {result.pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-3">
          {result.page > 1 && (
            <Link href={pageHref(result.page - 1)} className="focus-ring inline-flex items-center gap-1 rounded-full border border-white/15 px-5 py-2.5 text-sm hover:bg-white/5">
              <ChevronLeft className="size-4" /> Previous
            </Link>
          )}
          <span className="px-3 text-sm text-haze">
            Page {result.page} of {result.pageCount}
          </span>
          {result.page < result.pageCount && (
            <Link href={pageHref(result.page + 1)} className="focus-ring inline-flex items-center gap-1 rounded-full border border-white/15 px-5 py-2.5 text-sm hover:bg-white/5">
              Next <ChevronRight className="size-4" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-14 animate-pulse rounded-full bg-white/5" />
      <div className="hidden h-12 animate-pulse rounded-full bg-white/5 lg:block" />
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-label="Loading artists">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="aspect-[4/6] animate-pulse rounded-3xl bg-white/5" />
      ))}
    </div>
  );
}
