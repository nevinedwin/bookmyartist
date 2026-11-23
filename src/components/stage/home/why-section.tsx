import { Headphones, Handshake, ShieldCheck, Wallet } from "lucide-react";
import { Reveal } from "../reveal";
import { SectionHeading } from "../section-heading";

const PILLARS = [
  {
    icon: Headphones,
    title: "Curated, not listed",
    text: "Every artist on our roster is vetted for live performance — not just their reels. We recommend acts we'd book for our own families.",
  },
  {
    icon: Handshake,
    title: "One point of contact",
    text: "We negotiate, schedule, handle riders and travel, and coordinate with your planner and venue — you deal with one team.",
  },
  {
    icon: Wallet,
    title: "Transparent paperwork",
    text: "Formal quotations, clear payment milestones, invoices and receipts. No surprises between the quote and the show.",
  },
  {
    icon: ShieldCheck,
    title: "Show-day reliability",
    text: "Confirmed schedules, buffer time for travel and set-up, and a backup plan. Double-bookings are prevented by design.",
  },
];

export function WhySection({ index = "05" }: { index?: string }) {
  return (
    <section aria-labelledby="why-title" className="relative py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1440px] gap-16 px-5 sm:px-8 lg:grid-cols-12 lg:px-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            <SectionHeading index={index || undefined} eyebrow="Why BookMyArtist" title="The calm behind the show." id="why-title">
              Great performances look effortless because someone sweated the details. That&apos;s our job.
            </SectionHeading>
          </div>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:col-span-7">
          {PILLARS.map((p, i) => (
            <li key={p.title} className="bg-midnight-950">
              <Reveal delay={i * 0.08} className="group relative h-full p-8 sm:p-10">
                <span aria-hidden="true" className="text-outline absolute top-6 right-8 font-display text-7xl font-bold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p.icon className="size-7 text-violet-glow transition-transform duration-500 group-hover:scale-110" aria-hidden="true" />
                <h3 className="mt-16 font-display text-xl font-semibold text-ink">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-haze">{p.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
