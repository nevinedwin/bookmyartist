import "server-only";
import { getService } from "@/content/services";
import type { EnquirySource } from "@/generated/prisma/enums";
import { BUDGET_RANGES, ENQUIRY_SOURCE_LABELS, EVENT_TYPE_LABELS } from "@/lib/labels";
import { rupees } from "@/lib/money";
import { calendarDateToUtc, formatCalendarDate } from "@/lib/time";
import { toE164, type PublicEnquiry } from "@/lib/validation/enquiry";
import { siteConfig } from "@/config/site";
import { db } from "@/server/db";
import { enqueueEmail } from "@/server/email/outbox";
import { enqueueWhatsApp } from "@/server/whatsapp/outbox";
import { notifyUsersWithPermission } from "@/server/services/notifications";
import { nextReference } from "@/server/services/sequence";

export interface SubmissionContext {
  ipHash: string | null;
  userAgent: string | null;
}

export interface EnquiryReceipt {
  reference: string;
}

/**
 * Persist a validated public enquiry. Everything — enquiry, artist link,
 * timeline entry, staff notifications and queued emails — is written in one
 * transaction. Email delivery happens afterwards, so it can never lose the
 * enquiry. Returns only the public reference.
 */
export async function createPublicEnquiry(input: PublicEnquiry, ctx: SubmissionContext): Promise<EnquiryReceipt> {
  const phone = toE164(input.phoneCountryCode, input.phone);
  const budget = input.budget ? BUDGET_RANGES.find((b) => b.id === input.budget) : undefined;
  const service = input.serviceSlug ? getService(input.serviceSlug) : undefined;

  const result = await db.$transaction(async (tx) => {
    const [category, artist, settings] = await Promise.all([
      input.categorySlug
        ? tx.artistCategory.findFirst({ where: { slug: input.categorySlug, isActive: true }, select: { id: true, name: true } })
        : null,
      input.artistSlug
        ? tx.artist.findFirst({
            where: { slug: input.artistSlug, status: "ACTIVE" },
            select: { id: true, stageName: true, categoryId: true, category: { select: { name: true } } },
          })
        : null,
      tx.businessSettings.findUnique({ where: { id: 1 }, select: { enquiryNotifyEmails: true, enquiryNotifyWhatsapp: true } }),
    ]);

    // Link to an existing client only on an exact, unambiguous contact match.
    const clientMatches = await tx.client.findMany({
      where: { archivedAt: null, OR: [{ email: input.email }, { phone }] },
      select: { id: true },
      take: 2,
    });
    const clientId = clientMatches.length === 1 ? clientMatches[0]?.id : undefined;

    const source: EnquirySource = input.source;
    const reference = await nextReference(tx, "enquiry");

    const enquiry = await tx.enquiry.create({
      data: {
        reference,
        source,
        sourcePath: input.sourcePath,
        sourceArtistId: source === "ARTIST_PROFILE" ? artist?.id : undefined,
        sourceService: service?.eventType,
        clientId,
        contactName: input.name,
        contactEmail: input.email,
        contactPhone: phone,
        organization: input.organization,
        eventType: input.eventType,
        eventDate: calendarDateToUtc(input.eventDate),
        eventCity: input.eventCity,
        venue: input.venue,
        audienceSize: input.audienceSize,
        categoryId: category?.id ?? artist?.categoryId,
        performanceType: input.performanceType,
        performersCount: input.performersCount,
        durationMinutes: input.durationMinutes,
        additionalRequirements: input.additionalRequirements,
        budgetMinPaise: budget ? rupees(budget.min) : undefined,
        budgetMaxPaise: budget?.max != null ? rupees(budget.max) : undefined,
        message: input.message,
        submitterIpHash: ctx.ipHash,
        userAgent: ctx.userAgent,
        priority: "MEDIUM",
        artists: artist ? { create: { artistId: artist.id, role: "PREFERRED" } } : undefined,
        activities: {
          create: {
            type: "CREATED",
            summary: `Enquiry submitted via ${ENQUIRY_SOURCE_LABELS[source].toLowerCase()}`,
            toStatus: "NEW",
            metadata: { clientAutoLinked: Boolean(clientId) },
          },
        },
      },
      select: { id: true, reference: true },
    });

    const eventTypeLabel = EVENT_TYPE_LABELS[input.eventType];
    const eventDateLabel = formatCalendarDate(input.eventDate);
    const adminUrl = `${siteConfig.url}/admin/enquiries/${enquiry.id}`;

    await notifyUsersWithPermission(tx, "enquiry:read", {
      type: "enquiry.new",
      title: `New enquiry from ${input.name}`,
      body: `${eventTypeLabel} · ${eventDateLabel} · ${input.eventCity}`,
      href: `/admin/enquiries/${enquiry.id}`,
    });

    const payload = {
      reference,
      name: input.name,
      eventType: eventTypeLabel,
      eventDate: eventDateLabel,
      eventCity: input.eventCity,
      venue: input.venue ?? null,
      artist: artist?.stageName ?? null,
      category: category?.name ?? artist?.category.name ?? null,
      budget: budget?.label ?? null,
      email: input.email,
      phone,
      organization: input.organization ?? null,
      message: input.message ?? null,
      source: ENQUIRY_SOURCE_LABELS[source],
      adminUrl,
    };

    await enqueueEmail(tx, {
      template: "enquiry.received",
      to: input.email,
      payload,
      entityType: "Enquiry",
      entityId: enquiry.id,
    });
    for (const to of settings?.enquiryNotifyEmails ?? []) {
      await enqueueEmail(tx, { template: "enquiry.new", to, payload, entityType: "Enquiry", entityId: enquiry.id });
    }
    for (const to of settings?.enquiryNotifyWhatsapp ?? []) {
      await enqueueWhatsApp(tx, {
        template: "enquiry.new",
        to,
        payload: { reference, name: input.name, eventType: eventTypeLabel, eventDate: eventDateLabel, eventCity: input.eventCity, adminUrl },
        entityType: "Enquiry",
        entityId: enquiry.id,
      });
    }

    return { reference: enquiry.reference };
  });

  return result;
}
