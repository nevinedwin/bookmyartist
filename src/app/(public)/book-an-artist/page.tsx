import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Clock, MessageCircle, ShieldCheck } from "lucide-react";
import { EnquiryWizard } from "@/components/stage/enquiry/wizard";
import { PageHero } from "@/components/stage/page-hero";
import { siteConfig } from "@/config/site";
import { EXPERIENCES } from "@/content/experiences";
import { IMAGES } from "@/content/images";
import { getService } from "@/content/services";
import { EventType } from "@/generated/prisma/enums";
import { businessToday } from "@/lib/time";
import { env } from "@/server/env";
import { issueFormToken } from "@/server/security/form-token";
import { getArtistOptions, getCategories } from "@/server/services/public/catalogue";

export const metadata: Metadata = {
  title: "Book an artist",
  description: "Tell us about your event and we'll recommend available artists, with a formal quotation from our team.",
  alternates: { canonical: "/book-an-artist" },
};

export default function BookPage({ searchParams }: PageProps<"/book-an-artist">) {
  return (
    <>
      <PageHero eyebrow="Booking enquiry" title="Let's find your sound." image={IMAGES.vintageMic}>
        Four short steps. No obligation — we&apos;ll check real availability and come back with options and a formal quotation.
      </PageHero>
      <section className="mx-auto grid max-w-[1440px] gap-12 px-5 pb-28 sm:px-8 lg:grid-cols-12 lg:px-12">
        <div className="rounded-[2rem] border border-white/10 bg-midnight-900/80 p-6 shadow-2xl shadow-electric/10 backdrop-blur sm:p-10 lg:col-span-8">
          <Suspense fallback={<WizardSkeleton />}>
            <WizardLoader searchParams={searchParams} />
          </Suspense>
        </div>
        <aside className="space-y-4 lg:col-span-4">
          {[
            { icon: Clock, title: "Reply within one business day", text: "A real person from our team reviews every enquiry." },
            { icon: ShieldCheck, title: "Your details stay private", text: "We never share your contact details with artists without permission." },
            { icon: MessageCircle, title: "Prefer to talk?", text: siteConfig.contact.phone ? `Call ${siteConfig.contact.phone} · ${siteConfig.contact.hours}` : siteConfig.contact.hours },
          ].map((item) => (
            <div key={item.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <item.icon className="mt-0.5 size-5 shrink-0 text-violet-glow" aria-hidden="true" />
              <div>
                <h2 className="font-medium text-ink">{item.title}</h2>
                <p className="mt-1 text-sm text-haze">{item.text}</p>
              </div>
            </div>
          ))}
        </aside>
      </section>
    </>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const isSlug = (v: string | undefined): v is string => !!v && /^[a-z0-9-]{1,80}$/.test(v);

async function WizardLoader({ searchParams }: { searchParams: PageProps<"/book-an-artist">["searchParams"] }) {
  const sp = await searchParams;
  await connection();
  const [categories, artists] = await Promise.all([getCategories(), getArtistOptions()]);

  const artistSlug = first(sp.artist);
  const categorySlug = first(sp.category);
  const serviceSlug = first(sp.service);
  const experienceSlug = first(sp.experience);
  const eventParam = first(sp.event);

  const artist = isSlug(artistSlug) ? artists.find((a) => a.slug === artistSlug) : undefined;
  const service = isSlug(serviceSlug) ? getService(serviceSlug) : undefined;
  const experience = isSlug(experienceSlug) ? EXPERIENCES.find((e) => e.slug === experienceSlug) : undefined;
  const eventType = service?.eventType ?? (eventParam && eventParam in EventType ? (eventParam as EventType) : undefined);

  const source = artist ? "ARTIST_PROFILE" : service ? "SERVICE_PAGE" : "BOOKING_FORM";
  const sourcePath = artist ? `/artists/${artist.slug}` : service ? `/services/${service.slug}` : experience ? `/experiences#${experience.slug}` : "/book-an-artist";

  return (
    <EnquiryWizard
      key={`${artist?.slug ?? ""}-${service?.slug ?? ""}-${experience?.slug ?? ""}`}
      categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
      artists={artists}
      initial={{
        artistSlug: artist?.slug,
        categorySlug: isSlug(categorySlug) ? categorySlug : undefined,
        eventType,
        serviceSlug: service?.slug,
        experienceName: experience?.name,
        source,
        sourcePath,
      }}
      formToken={issueFormToken()}
      today={businessToday()}
      turnstileSiteKey={env().TURNSTILE_SECRET_KEY ? env().NEXT_PUBLIC_TURNSTILE_SITE_KEY : undefined}
    />
  );
}

function WizardSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading form">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-1 rounded-full bg-white/10" />
        ))}
      </div>
      <div className="h-10 w-2/3 animate-pulse rounded-xl bg-white/5" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}
