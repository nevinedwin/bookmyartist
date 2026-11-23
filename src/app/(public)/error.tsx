"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="flex min-h-[70svh] items-center px-5 pt-32 pb-20 sm:px-8">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">The sound cut out for a moment.</h1>
        <p className="mt-4 text-haze">Something went wrong while loading this page. Please try again.</p>
        {error.digest && <p className="mt-2 text-xs text-haze/70">Error reference: {error.digest}</p>}
        <div className="mt-8 flex justify-center gap-3">
          <button type="button" onClick={reset} className="focus-ring rounded-full bg-gradient-to-r from-electric to-magenta px-6 py-3 text-sm font-semibold text-white">
            Try again
          </button>
          <Link href="/" className="focus-ring rounded-full border border-white/15 px-6 py-3 text-sm text-ink">
            Home
          </Link>
        </div>
      </div>
    </section>
  );
}
