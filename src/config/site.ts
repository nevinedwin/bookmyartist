/**
 * Brand configuration. The brand is BookMyArtist (see docs/DECISIONS.md ADR-013,
 * ADR-017) — change it here and in Business Settings.
 */
export const siteConfig = {
  name: "BookMyArtist",
  legalName: "BookMyArtist Entertainment",
  tagline: "Every Celebration Deserves Its Own Soundtrack.",
  description:
    "BookMyArtist books singers, DJs, live bands, dancers, emcees and headline acts for weddings, corporate events, festivals and private celebrations across India.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  locale: "en_IN",
  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "",
    whatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "",
    city: "Mumbai, India",
    hours: "Mon – Sat · 10:00 – 19:00 IST",
  },
  social: {
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ?? "",
    youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE ?? "",
  },
} as const;

export const publicNav = [
  { href: "/artists", label: "Artists" },
  { href: "/categories", label: "Categories" },
  { href: "/services", label: "Services" },
  { href: "/experiences", label: "Experiences" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;
