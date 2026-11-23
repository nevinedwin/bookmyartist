import Image from "next/image";
import Link from "next/link";
import type { ShowcaseItem } from "@/server/services/public/catalogue";
import { cn } from "@/lib/utils";
import { ImageReveal } from "../reveal";
import { SectionHeading } from "../section-heading";

const SHAPES = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]", "aspect-[4/3]", "aspect-[4/5]", "aspect-square"];

export function GallerySection({ items }: { items: ShowcaseItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="gallery-title" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <SectionHeading index="07" eyebrow="On stage" title="Featured performances." id="gallery-title" />
        <ul className="mt-14 columns-1 gap-5 sm:columns-2 lg:columns-3">
          {items.map((item, i) => (
            <li key={item.id} className="mb-5 break-inside-avoid">
              <ImageReveal delay={(i % 3) * 0.08}>
                <Link
                  href={`/artists/${item.artist.slug}`}
                  className={cn("focus-ring group relative block overflow-hidden rounded-3xl", SHAPES[i % SHAPES.length])}
                >
                  <Image
                    src={item.url}
                    alt={item.alt ?? `${item.artist.stageName} performing`}
                    fill
                    sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-[1.4s] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight-950/90 via-transparent opacity-80 transition-opacity group-hover:opacity-100" />
                  <div className="absolute inset-x-5 bottom-5 translate-y-2 transition-transform duration-500 group-hover:translate-y-0">
                    <p className="text-xs tracking-[0.2em] text-ink/70 uppercase">{item.artist.categoryName}</p>
                    <p className="mt-1 font-display text-xl font-semibold text-ink">{item.artist.stageName}</p>
                  </div>
                </Link>
              </ImageReveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
