import { Cta } from "./cta";
import { Equalizer } from "./equalizer";

export function NotFoundView() {
  return (
    <section className="grain relative flex min-h-[80svh] items-center overflow-hidden px-5 pt-32 pb-20 sm:px-8">
      <div aria-hidden="true" className="absolute top-1/4 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-electric/20 blur-[140px]" />
      <div className="relative mx-auto max-w-3xl text-center">
        <Equalizer bars={14} className="mx-auto h-10 w-fit justify-center opacity-60" />
        <p className="mt-8 font-display text-[clamp(5rem,18vw,12rem)] leading-none font-bold text-outline">404</p>
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-5xl">This track isn&apos;t on the setlist.</h1>
        <p className="mt-4 text-haze">The page you&apos;re looking for has moved or never existed.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Cta href="/">Back to home</Cta>
          <Cta href="/artists" variant="ghost">
            Browse artists
          </Cta>
        </div>
      </div>
    </section>
  );
}
