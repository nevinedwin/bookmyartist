import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";
import { siteConfig } from "@/config/site";

/** Split-screen frame for sign-in screens: brand panel (Stage palette) + form panel (Desk). */
export function AuthFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-midnight-950 p-12 text-ink lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="absolute -top-40 -left-40 size-[36rem] rounded-full bg-electric/40 blur-[120px]" />
        <div aria-hidden="true" className="absolute -right-32 bottom-0 size-[28rem] rounded-full bg-magenta/25 blur-[120px]" />
        <Logo className="relative text-xl" />
        <div className="relative">
          <p className="font-display text-4xl leading-tight font-semibold text-balance">{siteConfig.tagline}</p>
          <p className="mt-4 max-w-md text-haze">Agency workspace for enquiries, artists, bookings and finance.</p>
        </div>
        <p className="relative text-xs text-haze">Authorised staff only. Sign-ins are logged.</p>
      </div>
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Logo className="mb-10 text-xl lg:hidden" accentClassName="text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 mb-8 text-sm text-muted-foreground">{description}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
