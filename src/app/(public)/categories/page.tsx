import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/stage/page-hero";
import { Reveal } from "@/components/stage/reveal";
import { IMAGES } from "@/content/images";
import { getCategories } from "@/server/services/public/catalogue";

export const metadata: Metadata = {
  title: "Artist categories",
  description: "Singers, DJs, live bands, instrumentalists, classical performers, dancers, anchors, comedians and celebrity performers.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <>
      <PageHero eyebrow="Categories" title="Every sound, one roster." image={IMAGES.colourFestival}>
        From a solo sitarist to a stadium headliner — browse by the kind of performance you have in mind.
      </PageHero>
      <section aria-label="All categories" className="mx-auto max-w-[1440px] px-5 pb-28 sm:px-8 lg:px-12">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => {
            const hasArtists = c.artistCount > 0;
            const href = hasArtists ? `/artists?category=${c.slug}` : `/book-an-artist?category=${c.slug}`;
            return (
              <li key={c.slug}>
                <Reveal delay={(i % 3) * 0.06} className="h-full">
                  <Link href={href} className="focus-ring group relative flex h-full min-h-80 flex-col overflow-hidden rounded-3xl border border-white/10">
                    {c.imageUrl && (
                      <Image src={c.imageUrl} alt="" fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition-transform duration-[1.2s] group-hover:scale-105" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-midnight-950 via-midnight-950/50 to-transparent" />
                    <div className="relative mt-auto p-7">
                      <p className="text-xs tracking-[0.2em] text-ink/70 uppercase">
                        {hasArtists ? `${c.artistCount} ${c.artistCount === 1 ? "artist" : "artists"}` : "On request"}
                      </p>
                      <h2 className="mt-2 flex items-center justify-between gap-4 font-display text-2xl font-semibold text-ink">
                        {c.name}
                        <ArrowUpRight className="size-5 shrink-0 transition-transform group-hover:rotate-45" aria-hidden="true" />
                      </h2>
                      {c.description && <p className="mt-2 text-sm text-ink/75">{c.description}</p>}
                    </div>
                  </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
