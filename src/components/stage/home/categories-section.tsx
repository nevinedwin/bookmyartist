import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PublicCategory } from "@/server/services/public/catalogue";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { SectionHeading } from "../section-heading";

// Asymmetric bento: spans per position on large screens.
const SPANS = [
  "lg:col-span-7 lg:row-span-2",
  "lg:col-span-5",
  "lg:col-span-5",
  "lg:col-span-4",
  "lg:col-span-4",
  "lg:col-span-4",
];

export function CategoriesSection({ categories }: { categories: PublicCategory[] }) {
  const shown = categories.filter((c) => c.artistCount > 0).slice(0, SPANS.length);
  if (shown.length === 0) return null;
  return (
    <section aria-labelledby="categories-title" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading index="02" eyebrow="Explore by sound" title="Find the act that fits the moment." id="categories-title" />
          <Link href="/categories" className="focus-ring inline-flex items-center gap-2 rounded-full text-sm font-medium text-ink hover:text-violet-glow">
            All categories <ArrowUpRight className="size-4" />
          </Link>
        </div>

        <div className="mt-14 grid auto-rows-[260px] grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-rows-[300px] lg:grid-cols-12">
          {shown.map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.06} className={cn("h-full", SPANS[i], i === 0 && "sm:col-span-2")}>
              <Link
                href={`/artists?category=${c.slug}`}
                className="focus-ring group relative flex h-full overflow-hidden rounded-3xl border border-white/10"
              >
                {c.imageUrl && (
                  <Image
                    src={c.imageUrl}
                    alt=""
                    fill
                    sizes={i === 0 ? "(min-width:1024px) 58vw, 100vw" : "(min-width:1024px) 33vw, 50vw"}
                    className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-midnight-950 via-midnight-950/40 to-transparent transition-opacity duration-500 group-hover:opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-br from-electric/0 to-magenta/0 mix-blend-color transition-colors duration-500 group-hover:from-electric/30 group-hover:to-magenta/20" />
                <div className="relative mt-auto flex w-full items-end justify-between gap-4 p-6 sm:p-8">
                  <div>
                    <p className="text-xs tracking-[0.2em] text-ink/70 uppercase">
                      {c.artistCount} {c.artistCount === 1 ? "artist" : "artists"}
                    </p>
                    <h3 className={cn("mt-2 font-display font-semibold tracking-tight text-ink", i === 0 ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl")}>
                      {c.name}
                    </h3>
                    {i === 0 && c.description && <p className="mt-3 max-w-md text-sm text-ink/75">{c.description}</p>}
                  </div>
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/5 backdrop-blur transition-all duration-500 group-hover:rotate-45 group-hover:bg-ink group-hover:text-midnight-950">
                    <ArrowUpRight className="size-5" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
