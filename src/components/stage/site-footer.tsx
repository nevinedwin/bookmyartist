import Link from "next/link";
import { cacheLife } from "next/cache";
import { ArrowUpRight } from "lucide-react";
import { SERVICES } from "@/content/services";
import { publicNav, siteConfig } from "@/config/site";
import { Logo } from "@/components/shared/logo";
import { Cta } from "./cta";

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export function SiteFooter() {
  const { contact, social } = siteConfig;
  const socials = [
    { label: "Instagram", href: social.instagram },
    { label: "YouTube", href: social.youtube },
  ].filter((s) => s.href);

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-midnight-950">
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[70rem] -translate-x-1/2 rounded-full bg-electric/25 blur-[140px]" />
      <div className="relative mx-auto max-w-[1440px] px-5 pt-20 pb-10 sm:px-8 lg:px-12">
        <div className="flex flex-col items-start justify-between gap-10 border-b border-white/10 pb-16 lg:flex-row lg:items-end">
          <p className="max-w-3xl font-display text-4xl leading-[1.05] font-semibold tracking-tight text-ink sm:text-6xl">
            Let&apos;s give your celebration <span className="text-gradient">its soundtrack.</span>
          </p>
          <Cta href="/book-an-artist" size="lg">
            Start an enquiry <ArrowUpRight />
          </Cta>
        </div>

        <div className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo className="text-xl" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-haze">{siteConfig.description}</p>
          </div>

          <nav aria-label="Explore" className="lg:col-span-2">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-haze uppercase">Explore</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {publicNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="focus-ring rounded text-ink/85 transition-colors hover:text-ink">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Services" className="lg:col-span-3">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-haze uppercase">Services</h2>
            <ul className="mt-5 grid grid-cols-1 gap-3 text-sm">
              {SERVICES.map((s) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`} className="focus-ring rounded text-ink/85 transition-colors hover:text-ink">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-haze uppercase">Talk to us</h2>
            <ul className="mt-5 space-y-3 text-sm text-ink/85">
              {contact.email && (
                <li>
                  <a href={`mailto:${contact.email}`} className="focus-ring rounded hover:text-ink">
                    {contact.email}
                  </a>
                </li>
              )}
              {contact.phone && (
                <li>
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="focus-ring rounded hover:text-ink">
                    {contact.phone}
                  </a>
                </li>
              )}
              <li>{contact.city}</li>
              <li className="text-haze">{contact.hours}</li>
              <li>
                <Link href="/contact" className="focus-ring inline-flex items-center gap-1 rounded text-violet-glow hover:text-ink">
                  Contact form <ArrowUpRight className="size-3.5" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-8 text-xs text-haze sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CopyrightYear /> {siteConfig.legalName}. All rights reserved.
          </p>
          {socials.length > 0 && (
            <ul className="flex gap-5">
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="focus-ring rounded hover:text-ink">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
