import { siteConfig } from "@/config/site";
import { button, esc, layout, nl2br, row, table } from "../html";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EnquirySummaryPayload {
  reference: string;
  name: string;
  eventType: string;
  eventDate: string;
  eventCity: string;
  venue?: string | null;
  artist?: string | null;
  category?: string | null;
  budget?: string | null;
  email: string;
  phone: string;
  organization?: string | null;
  message?: string | null;
  source: string;
  adminUrl: string;
}

const footer = () =>
  `${esc(siteConfig.name)} · ${esc(siteConfig.tagline)}<br>You're receiving this because of an enquiry made on ${esc(siteConfig.url.replace(/^https?:\/\//, ""))}.`;

const TEMPLATES = {
  /** Customer: we received your enquiry. */
  "enquiry.received": (p: EnquirySummaryPayload): RenderedEmail => {
    const subject = `We've received your enquiry — ${p.reference}`;
    const body = `
<p style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#7c3aed;margin:0 0 8px">Enquiry received</p>
<h1 style="font-size:24px;line-height:30px;margin:0 0 16px">Thank you, ${esc(p.name.split(" ")[0])}.</h1>
<p style="font-size:15px;line-height:24px;margin:0">Our team is reviewing your ${esc(p.eventType.toLowerCase())} enquiry and will get back to you within one business day with artist availability and options.</p>
<p style="font-size:15px;line-height:24px">Your reference is <strong>${esc(p.reference)}</strong> — please quote it in any message.</p>
${table(
  row("Event", p.eventType) + row("Date", p.eventDate) + row("City", p.eventCity) + row("Venue", p.venue) +
    row("Artist", p.artist) + row("Category", p.category),
)}
<p style="font-size:13px;line-height:20px;color:#6b6788;margin-top:24px">Availability and pricing are confirmed only in a formal quotation from our team.</p>`;
    const text = `Thank you, ${p.name}.\n\nWe've received your enquiry ${p.reference} for a ${p.eventType} on ${p.eventDate} in ${p.eventCity}. Our team will get back to you within one business day.\n\n${siteConfig.name}`;
    return { subject, html: layout({ preheader: `Reference ${p.reference}`, title: subject, body, footer: footer() }), text };
  },

  /** Internal: new enquiry alert for the agency. */
  "enquiry.new": (p: EnquirySummaryPayload): RenderedEmail => {
    const subject = `New enquiry ${p.reference}: ${p.eventType} · ${p.eventDate} · ${p.eventCity}`;
    const body = `
<p style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#e935c1;margin:0 0 8px">New enquiry</p>
<h1 style="font-size:22px;line-height:28px;margin:0 0 8px">${esc(p.name)}${p.organization ? ` · ${esc(p.organization)}` : ""}</h1>
<p style="font-size:14px;margin:0;color:#6b6788">${esc(p.reference)} · via ${esc(p.source)}</p>
${table(
  row("Event", p.eventType) + row("Date", p.eventDate) + row("City", p.eventCity) + row("Venue", p.venue) +
    row("Artist", p.artist) + row("Category", p.category) + row("Budget", p.budget) +
    row("Email", p.email) + row("Phone", p.phone),
)}
${p.message ? `<p style="font-size:14px;line-height:22px;background:#faf9fd;border-radius:12px;padding:16px;margin-top:16px">${nl2br(p.message)}</p>` : ""}
${button(p.adminUrl, "Open in dashboard")}`;
    const text = `New enquiry ${p.reference}\n${p.name} — ${p.email} — ${p.phone}\n${p.eventType} on ${p.eventDate} in ${p.eventCity}\n\n${p.adminUrl}`;
    return { subject, html: layout({ preheader: `${p.name} · ${p.eventCity}`, title: subject, body, footer: "Internal notification." }), text };
  },
} as const;

export type EmailTemplate = keyof typeof TEMPLATES;
export type EmailPayload<T extends EmailTemplate> = Parameters<(typeof TEMPLATES)[T]>[0];

export function renderEmail<T extends EmailTemplate>(template: T, payload: EmailPayload<T>): RenderedEmail {
  const render = TEMPLATES[template] as (p: EmailPayload<T>) => RenderedEmail;
  return render(payload);
}

export function isEmailTemplate(value: string): value is EmailTemplate {
  return value in TEMPLATES;
}
