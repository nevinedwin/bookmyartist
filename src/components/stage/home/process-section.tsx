import { Reveal } from "../reveal";
import { SectionHeading } from "../section-heading";

const STEPS = [
  { title: "Tell us about the event", text: "Share the date, city, crowd and the mood you want. Two minutes with our enquiry form." },
  { title: "Get a curated shortlist", text: "We check real availability and send artists that fit your budget and audience." },
  { title: "Confirm with a quotation", text: "A formal quote with performance details and payment terms. An advance secures the date." },
  { title: "Enjoy the show", text: "We handle riders, schedules, travel and show-day coordination. You enjoy the encore." },
];

export function ProcessSection({ index = "06" }: { index?: string }) {
  return (
    <section aria-labelledby="process-title" className="relative overflow-hidden border-y border-white/10 bg-midnight-900 py-24 sm:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -bottom-40 size-[32rem] rounded-full bg-magenta/15 blur-[140px]" />
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <SectionHeading index={index || undefined} eyebrow="How booking works" title="From first message to final bow." id="process-title" />
        <ol className="relative mt-16 grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div aria-hidden="true" className="absolute top-6 right-0 left-0 hidden h-px bg-gradient-to-r from-electric via-magenta to-transparent lg:block" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <Reveal delay={i * 0.12}>
                <span className="relative flex size-12 items-center justify-center rounded-full border border-white/20 bg-midnight-950 font-display text-sm font-semibold text-ink">
                  {i + 1}
                  <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-full bg-electric/40 blur-md" />
                </span>
                <h3 className="mt-8 font-display text-xl font-semibold text-ink">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-haze">{s.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
