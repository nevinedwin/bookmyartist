import { env } from "@/server/env";

/**
 * WhatsApp business-initiated messages must use a template approved by Meta.
 * Create it in WhatsApp Manager exactly as below (category: Utility), then set
 * WHATSAPP_TEMPLATE_NEW_ENQUIRY to its name if it isn't "new_enquiry":
 *
 *   New enquiry {{1}} from {{2}}: {{3}} on {{4}} in {{5}}. Open it: {{6}}
 *
 * Only what staff need to triage is sent — never the customer's phone or email.
 */
export interface NewEnquiryWhatsApp {
  reference: string;
  name: string;
  eventType: string;
  eventDate: string;
  eventCity: string;
  adminUrl: string;
}

export const WHATSAPP_TEMPLATES = {
  "enquiry.new": (p: NewEnquiryWhatsApp) => ({
    name: env().WHATSAPP_TEMPLATE_NEW_ENQUIRY,
    params: [p.reference, p.name, p.eventType, p.eventDate, p.eventCity, p.adminUrl],
  }),
} as const;

export type WhatsAppTemplate = keyof typeof WHATSAPP_TEMPLATES;

export function isWhatsAppTemplate(key: string): key is WhatsAppTemplate {
  return key in WHATSAPP_TEMPLATES;
}

/**
 * Meta rejects parameters containing newlines, tabs or 4+ consecutive spaces,
 * and empty ones. Customer-typed values go through this.
 */
export function templateParam(value: string, max = 200): string {
  const clean = value.replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim();
  return (clean || "—").slice(0, max);
}
