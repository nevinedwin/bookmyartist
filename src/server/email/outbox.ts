import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "@/server/db";
import { isEmailTemplate, renderEmail, type EmailPayload, type EmailTemplate } from "./templates";
import { sendEmail } from "./transport";

const MAX_ATTEMPTS = 6;
/** Exponential backoff: 1m, 5m, 25m, ~2h, ~10h. */
const backoffMs = (attempt: number) => 60_000 * 5 ** Math.max(0, attempt - 1);

/**
 * Queue an email inside the caller's transaction. Delivery happens later
 * (after the response, and via the cron route), so an email outage can never
 * roll back or lose the business record.
 */
export async function enqueueEmail<T extends EmailTemplate>(
  tx: Tx,
  input: { template: T; to: string; payload: EmailPayload<T>; entityType?: string; entityId?: string },
) {
  const { subject } = renderEmail(input.template, input.payload);
  await tx.emailMessage.create({
    data: {
      template: input.template,
      toAddress: input.to,
      subject,
      payload: input.payload as unknown as Prisma.InputJsonValue,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });
}

export interface DeliveryReport {
  sent: number;
  failed: number;
  skipped: number;
}

/** Deliver due messages. Safe to run concurrently: rows are claimed with SKIP LOCKED. */
export async function deliverPendingEmails(limit = 20): Promise<DeliveryReport> {
  const report: DeliveryReport = { sent: 0, failed: 0, skipped: 0 };

  const claimed = await db.$queryRaw<{ id: string }[]>`
    UPDATE "EmailMessage" SET "status" = 'SENDING', "updatedAt" = now()
    WHERE "id" IN (
      SELECT "id" FROM "EmailMessage"
      WHERE ("status" = 'PENDING' OR ("status" = 'FAILED' AND "attempts" < ${MAX_ATTEMPTS}))
        AND "nextAttemptAt" <= now()
      ORDER BY "createdAt"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"`;

  for (const { id } of claimed) {
    const message = await db.emailMessage.findUnique({ where: { id } });
    if (!message) continue;
    const attempts = message.attempts + 1;

    if (!isEmailTemplate(message.template)) {
      await db.emailMessage.update({
        where: { id },
        data: { status: "FAILED", attempts: MAX_ATTEMPTS, lastError: `Unknown template ${message.template}` },
      });
      report.failed++;
      continue;
    }

    const rendered = renderEmail(message.template, message.payload as never);
    const result = await sendEmail({ to: message.toAddress, ...rendered, idempotencyKey: message.id });

    if (result.status === "sent") {
      await db.emailMessage.update({
        where: { id },
        data: { status: "SENT", attempts, sentAt: new Date(), providerMessageId: result.providerMessageId, lastError: null },
      });
      report.sent++;
    } else if (result.status === "skipped") {
      await db.emailMessage.update({ where: { id }, data: { status: "SKIPPED", attempts, lastError: result.reason } });
      report.skipped++;
    } else {
      const giveUp = !result.retryable || attempts >= MAX_ATTEMPTS;
      await db.emailMessage.update({
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
