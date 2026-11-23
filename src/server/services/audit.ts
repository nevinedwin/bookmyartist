import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "@/server/db";

export interface AuditEntry {
  actorId: string | null;
  action: string; // e.g. "auth.login", "user.role_changed"
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ipHash?: string | null;
}

/**
 * Append-only audit trail for security and financial changes. Never pass
 * passwords, tokens or full personal records — only IDs and changed fields.
 */
export async function audit(entry: AuditEntry, tx: Tx | typeof db = db): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      before: entry.before,
      after: entry.after,
      ipHash: entry.ipHash ?? null,
    },
  });
}

/** "asha@agency.in" → "a***@agency.in": enough to recognise an address in the audit log. */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

/** "+919876543210" → "+91******3210". */
export function maskPhone(phone: string | null): string | null {
  return phone ? `${phone.slice(0, 3)}${"*".repeat(Math.max(0, phone.length - 7))}${phone.slice(-4)}` : null;
}
