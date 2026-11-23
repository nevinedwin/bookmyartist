import Link from "next/link";
import { ArrowUpRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Reveal } from "../reveal";
import { SectionHeading } from "../section-heading";

export function ContactSection() {
  const { contact } = siteConfig;
  const items = [
    contact.phone && { icon: Phone, label: "Call", value: contact.phone, href: `tel:${contact.phone.replace(/\s/g, "")}` },
    contact.email && { icon: Mail, label: "Email", value: contact.email, href: `mailto:${contact.email}` },
    { icon: MapPin, label: "Studio", value: contact.city },
    { icon: Clock, label: "Hours", value: contact.hours },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href?: string }[];

  return (
    <section aria-labelledby="contact-title" className="py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1440px] gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:px-12">
        <SectionHeading index="09" eyebrow="Contact" title="Not sure who to book? Talk to a human." id="contact-title">
          Tell us about the event and we&apos;ll come back with options — usually within one business day.
        </SectionHeading>
        <Reveal className="grid content-end gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const body = (
              <>
                <item.icon className="size-5 text-violet-glow" aria-hidden="true" />
                <p className="mt-6 text-xs tracking-[0.2em] text-haze uppercase">{item.label}</p>
                <p className="mt-1 text-ink">{item.value}</p>
              </>
            );
            return item.href ? (
              <a key={item.label} href={item.href} className="focus-ring rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/25">
                {body}
              </a>
            ) : (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                {body}
              </div>
            );
          })}
          <Link
            href="/contact"
            className="focus-ring group flex items-center justify-between rounded-2xl bg-gradient-to-r from-electric to-magenta p-6 font-medium text-white sm:col-span-2"
          >
            Send us a message
            <ArrowUpRight className="size-5 transition-transform group-hover:rotate-45" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
