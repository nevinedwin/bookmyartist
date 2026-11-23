import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "@/server/db";
import type { DeliveryReport } from "@/server/email/outbox";
import { WHATSAPP_TEMPLATES, type WhatsAppTemplate, isWhatsAppTemplate } from "./templates";
import { sendWhatsAppTemplate } from "./transport";

const MAX_ATTEMPTS = 6;
const backoffMs = (attempt: number) => 60_000 * 5 ** Math.max(0, attempt - 1);

type Payload<T extends WhatsAppTemplate> = Parameters<(typeof WHATSAPP_TEMPLATES)[T]>[0];

/** Queue a WhatsApp message inside the caller's transaction (same guarantees as enqueueEmail). */
export async function enqueueWhatsApp<T extends WhatsAppTemplate>(
  tx: Tx,
  input: { template: T; to: string; payload: Payload<T>; entityType?: string; entityId?: string },
) {
  await tx.whatsAppMessage.create({
    data: {
      template: input.template,
      toNumber: input.to,
      payload: input.payload as unknown as Prisma.InputJsonValue,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });
}

/** Deliver due messages. Safe to run concurrently: rows are claimed with SKIP LOCKED. */
export async function deliverPendingWhatsApp(limit = 20): Promise<DeliveryReport> {
  const report: DeliveryReport = { sent: 0, failed: 0, skipped: 0 };
  const claimed = await db.$queryRaw<{ id: string }[]>`
    UPDATE "WhatsAppMessage" SET "status" = 'SENDING', "updatedAt" = now()
    WHERE "id" IN (
      SELECT "id" FROM "WhatsAppMessage"
      WHERE ("status" = 'PENDING' OR ("status" = 'FAILED' AND "attempts" < ${MAX_ATTEMPTS}))
        AND "nextAttemptAt" <= now()
      ORDER BY "createdAt"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"`;

  for (const { id } of claimed) {
    const message = await db.whatsAppMessage.findUnique({ where: { id } });
    if (!message) continue;
    const attempts = message.attempts + 1;
    if (!isWhatsAppTemplate(message.template)) {
      await db.whatsAppMessage.update({ where: { id }, data: { status: "FAILED", attempts: MAX_ATTEMPTS, lastError: `Unknown template ${message.template}` } });
      report.failed++;
      continue;
    }
    const { name, params } = WHATSAPP_TEMPLATES[message.template](message.payload as never);
    const result = await sendWhatsAppTemplate({ to: message.toNumber, template: name, params });

    if (result.status === "sent") {
      await db.whatsAppMessage.update({
        where: { id },
        data: { status: "SENT", attempts, sentAt: new Date(), providerMessageId: result.providerMessageId, lastError: null },
      });
      report.sent++;
    } else if (result.status === "skipped") {
      await db.whatsAppMessage.update({ where: { id }, data: { status: "SKIPPED", attempts, lastError: result.reason } });
      report.skipped++;
    } else {
      const giveUp = !result.retryable || attempts >= MAX_ATTEMPTS;
      await db.whatsAppMessage.update({
        where: { id },
        data: {
          status: "FAILED",
          attempts: giveUp ? MAX_ATTEMPTS : attempts,
          lastError: result.error,
          nextAttemptAt: new Date(Date.now() + backoffMs(attempts)),
        },
      });
      report.failed++;
    }
  }
  return report;
}
