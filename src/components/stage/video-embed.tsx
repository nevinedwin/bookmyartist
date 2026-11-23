"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { useState } from "react";

/**
 * Privacy-friendly video: shows a poster and only loads the YouTube/Vimeo
 * iframe after the visitor clicks play (no third-party requests before that).
 */
export function VideoEmbed({
  provider,
  videoId,
  url,
  title,
  thumbnailUrl,
}: {
  provider: "YOUTUBE" | "VIMEO" | "CLOUDINARY" | "EXTERNAL";
  videoId: string | null;
  url: string;
  title: string;
  thumbnailUrl: string | null;
}) {
  const [playing, setPlaying] = useState(false);

  if (provider === "CLOUDINARY") {
    return (
      <video controls preload="none" poster={thumbnailUrl ?? undefined} className="aspect-video w-full rounded-2xl bg-black">
        <source src={url} />
        <track kind="captions" />
      </video>
    );
  }

  const embed =
    provider === "YOUTUBE" && videoId
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`
      : provider === "VIMEO" && videoId
        ? `https://player.vimeo.com/video/${encodeURIComponent(videoId)}?autoplay=1&dnt=1`
        : null;
  const poster = thumbnailUrl ?? (provider === "YOUTUBE" && videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null);

  if (!embed) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="focus-ring block rounded-2xl border border-white/15 p-6 text-ink hover:bg-white/5">
        Watch “{title}” ↗
      </a>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-midnight-900">
      {playing ? (
        <iframe
          src={embed}
          title={title}
          className="absolute inset-0 size-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="focus-ring group absolute inset-0" aria-label={`Play video: ${title}`}>
          {poster && <Image src={poster} alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover opacity-80" />}
          <span className="absolute inset-0 bg-gradient-to-t from-midnight-950/80 to-transparent" />
          <span className="absolute top-1/2 left-1/2 flex size-18 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-electric to-magenta text-white shadow-2xl transition-transform group-hover:scale-110">
            <Play className="ml-1 size-7 fill-current" />
          </span>
          <span className="absolute bottom-4 left-5 text-left text-sm font-medium text-ink">{title}</span>
        </button>
      )}
    </div>
  );
}
