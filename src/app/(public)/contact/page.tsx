import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { QuickEnquiryForm } from "@/components/stage/enquiry/quick-form";
import { PageHero } from "@/components/stage/page-hero";
import { siteConfig } from "@/config/site";
import { IMAGES } from "@/content/images";
import { businessToday } from "@/lib/time";
import { env } from "@/server/env";
import { issueFormToken } from "@/server/security/form-token";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${siteConfig.name} about artists for your event.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const { contact } = siteConfig;
  const details = [
    contact.phone && { icon: Phone, label: "Phone", value: contact.phone, href: `tel:${contact.phone.replace(/\s/g, "")}` },
    contact.email && { icon: Mail, label: "Email", value: contact.email, href: `mailto:${contact.email}` },
    { icon: MapPin, label: "Based in", value: contact.city },
    { icon: Clock, label: "Hours", value: contact.hours },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href?: string }[];

  return (
    <>
      <PageHero eyebrow="Contact" title="Say hello. We'll bring the music." image={IMAGES.neonSign}>
        A quick note is enough — share the date and city and we&apos;ll take it from there.
      </PageHero>
      <section className="mx-auto grid max-w-[1440px] gap-12 px-5 pb-28 sm:px-8 lg:grid-cols-12 lg:px-12">
        <div className="rounded-[2rem] border border-white/10 bg-midnight-900/80 p-6 sm:p-10 lg:col-span-8">
          <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white/5" role="status" aria-label="Loading form" />}>
            <ContactForm />
          </Suspense>
        </div>
        <aside className="space-y-4 lg:col-span-4">
          {details.map((d) => {
            const inner = (
              <>
                <d.icon className="size-5 text-violet-glow" aria-hidden="true" />
                <p className="mt-4 text-xs tracking-[0.2em] text-haze uppercase">{d.label}</p>
                <p className="mt-1 text-ink">{d.value}</p>
              </>
            );
            return d.href ? (
              <a key={d.label} href={d.href} className="focus-ring block rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-white/25">
                {inner}
              </a>
            ) : (
              <div key={d.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                {inner}
              </div>
            );
          })}
        </aside>
      </section>
    </>
  );
}

async function ContactForm() {
  await connection();
  return (
    <QuickEnquiryForm
      formToken={issueFormToken()}
      today={businessToday()}
      turnstileSiteKey={env().TURNSTILE_SECRET_KEY ? env().NEXT_PUBLIC_TURNSTILE_SITE_KEY : undefined}
    />
  );
}
