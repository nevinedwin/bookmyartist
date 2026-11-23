import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, MapPin, Star } from "lucide-react";
import { formatINR } from "@/lib/money";
import type { PublicArtistCard } from "@/server/services/public/catalogue";
import { cn } from "@/lib/utils";

/**
 * Artist listing card. The whole card links to the profile; a separate
 * "Enquire" link pre-selects the artist in the booking wizard.
 */
export function ArtistCard({
  artist,
  className,
  sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 90vw",
  priority = false,
}: {
  artist: PublicArtistCard;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const image = artist.imageUrl ?? artist.coverUrl;
  return (
    <article
      className={cn(
        "group/card relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-midnight-900 transition-[border-color,transform] duration-500 hover:-translate-y-1 hover:border-white/25",
        className,
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={`${artist.stageName}, ${artist.category.name.toLowerCase()} based in ${artist.baseCity}`}
            fill
            sizes={sizes}
            loading={priority ? "eager" : "lazy"}
            className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/card:scale-[1.06]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-electric/40 to-magenta/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-midnight-950 via-midnight-950/20 to-transparent" />
        <div className="absolute inset-x-4 top-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/15 bg-midnight-950/60 px-3 py-1 text-[11px] font-medium tracking-[0.14em] text-ink uppercase backdrop-blur-md">
            {artist.category.name}
          </span>
          {artist.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-magenta/90 px-2.5 py-1 text-[11px] font-semibold text-white">
              <Star className="size-3 fill-current" aria-hidden="true" /> Featured
            </span>
          )}
        </div>
        <div className="absolute inset-x-5 bottom-5">
          <h3 className="font-display text-2xl leading-tight font-semibold tracking-tight text-ink">
            <Link href={`/artists/${artist.slug}`} className="focus-ring rounded after:absolute after:inset-0 after:content-['']">
              {artist.stageName}
            </Link>
          </h3>
          {artist.tagline && <p className="mt-1 text-sm text-ink/75">{artist.tagline}</p>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="line-clamp-2 text-sm leading-relaxed text-haze">{artist.shortBio}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink/80">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 text-violet-glow" aria-hidden="true" />
            {artist.baseCity}
          </span>
          {artist.availabilityVerified && (
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <BadgeCheck className="size-3.5" aria-hidden="true" /> Availability verified
            </span>
          )}
          {artist.priceFromPaise && (
            <span className="ml-auto font-medium text-ink">From {formatINR(artist.priceFromPaise, { compact: true })}</span>
          )}
        </div>
        <div className="relative z-10 mt-auto flex items-center gap-3 border-t border-white/10 pt-4">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-ink">
            View profile
            <ArrowUpRight className="size-4 transition-transform group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5" aria-hidden="true" />
          </span>
          <Link
            href={`/book-an-artist?artist=${artist.slug}`}
            className="focus-ring ml-auto rounded-full border border-white/15 px-4 py-2 text-xs font-semibold tracking-wide text-ink transition-colors hover:border-magenta hover:bg-magenta/15"
            aria-label={`Enquire about ${artist.stageName}`}
          >
            Enquire
          </Link>
        </div>
      </div>
    </article>
  );
}
