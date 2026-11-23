/** Shell shown while an artist profile not prerendered at build time streams in. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-[1440px] px-5 pt-40 pb-24 sm:px-8 lg:px-12">
      <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
      <div className="mt-8 h-20 w-2/3 animate-pulse rounded-2xl bg-white/10" />
      <div className="mt-6 h-6 w-1/3 animate-pulse rounded bg-white/5" />
      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-3xl bg-white/5 lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-3xl bg-white/5" />
      </div>
    </div>
  );
}
