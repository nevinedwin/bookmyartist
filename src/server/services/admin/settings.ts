import "server-only";
import { siteConfig } from "@/config/site";
import type { AlertSettingsInput } from "@/lib/validation/settings";
import { type Actor, authorize } from "@/server/auth/actor";
import { db } from "@/server/db";
import { type DeliveryReport, deliverPendingEmails, enqueueEmail } from "@/server/email/outbox";
import { isEmailConfigured } from "@/server/email/transport";
import { deliverPendingWhatsApp, enqueueWhatsApp } from "@/server/whatsapp/outbox";
import { isWhatsAppConfigured } from "@/server/whatsapp/transport";
import { audit, maskEmail, maskPhone } from "../audit";

/*
 * Who hears about new enquiries. Stored on the BusinessSettings singleton and
 * read inside the enquiry transaction, so a change applies to the next enquiry.
 */

export interface DeliveryLogRow {
  id: string;
  channel: "email" | "whatsapp";
  to: string;
  template: string;
  status: string;
  lastError: string | null;
  createdAt: Date;
}

export interface AlertSettings {
  emails: string[];
  whatsapp: string[];
  emailConfigured: boolean;
  whatsappConfigured: boolean;
  recent: DeliveryLogRow[];
}

export async function getAlertSettings(actor: Actor): Promise<AlertSettings> {
  authorize(actor, "settings:write");
  const [settings, emails, whatsapp] = await Promise.all([
    db.businessSettings.findUnique({ where: { id: 1 }, select: { enquiryNotifyEmails: true, enquiryNotifyWhatsapp: true } }),
    db.emailMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, toAddress: true, template: true, status: true, lastError: true, createdAt: true },
    }),
    db.whatsAppMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, toNumber: true, template: true, status: true, lastError: true, createdAt: true },
    }),
  ]);
  const recent: DeliveryLogRow[] = [
    ...emails.map((m) => ({ id: m.id, channel: "email" as const, to: m.toAddress, template: m.template, status: m.status, lastError: m.lastError, createdAt: m.createdAt })),
    ...whatsapp.map((m) => ({ id: m.id, channel: "whatsapp" as const, to: m.toNumber, template: m.template, status: m.status, lastError: m.lastError, createdAt: m.createdAt })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 12);
  return {
    emails: settings?.enquiryNotifyEmails ?? [],
    whatsapp: settings?.enquiryNotifyWhatsapp ?? [],
    emailConfigured: isEmailConfigured(),
    whatsappConfigured: isWhatsAppConfigured(),
    recent,
  };
}

export async function updateAlertSettings(actor: Actor, input: AlertSettingsInput): Promise<void> {
  authorize(actor, "settings:write");
  await db.$transaction(async (tx) => {
    const before = await tx.businessSettings.findUnique({ where: { id: 1 }, select: { enquiryNotifyEmails: true, enquiryNotifyWhatsapp: true } });
    await tx.businessSettings.upsert({
      where: { id: 1 },
      update: { enquiryNotifyEmails: input.emails, enquiryNotifyWhatsapp: input.whatsapp, updatedById: actor.userId },
      create: { id: 1, agencyName: siteConfig.name, enquiryNotifyEmails: input.emails, enquiryNotifyWhatsapp: input.whatsapp, updatedById: actor.userId },
    });
    await audit(
      {
        actorId: actor.userId,
        action: "settings.alerts_updated",
        entityType: "BusinessSettings",
        entityId: null,
        before: before ? { emails: before.enquiryNotifyEmails.map(maskEmail), whatsapp: before.enquiryNotifyWhatsapp.map(maskPhone) } : undefined,
        after: { emails: input.emails.map(maskEmail), whatsapp: input.whatsapp.map(maskPhone) },
      },
      tx,
    );
  });
}

/** Send a sample alert to every saved recipient now, so setup problems show up before a real enquiry does. */
export async function sendTestAlert(actor: Actor): Promise<{ email: DeliveryReport; whatsapp: DeliveryReport; recipients: number }> {
  authorize(actor, "settings:write");
  const settings = await db.businessSettings.findUnique({ where: { id: 1 }, select: { enquiryNotifyEmails: true, enquiryNotifyWhatsapp: true } });
  const emails = settings?.enquiryNotifyEmails ?? [];
  const numbers = settings?.enquiryNotifyWhatsapp ?? [];
  const sample = {
    reference: "ENQ-TEST",
    name: "Test alert (please ignore)",
    eventType: "Wedding",
    eventDate: "14 Feb 2027",
    eventCity: "Udaipur",
    adminUrl: `${siteConfig.url}/admin/settings`,
  };
  await db.$transaction(async (tx) => {
    for (const to of emails) {
      await enqueueEmail(tx, {
        template: "enquiry.new",
        to,
        payload: { ...sample, venue: null, artist: null, category: null, budget: null, email: "customer@example.invalid", phone: "+910000000000", organization: null, message: "This is a test alert.", source: "Test" },
        entityType: "Test",
      });
    }
    for (const to of numbers) await enqueueWhatsApp(tx, { template: "enquiry.new", to, payload: sample, entityType: "Test" });
  });
  const [email, whatsapp] = await Promise.all([deliverPendingEmails(20), deliverPendingWhatsApp(20)]);
  return { email, whatsapp, recipients: emails.length + numbers.length };
}
