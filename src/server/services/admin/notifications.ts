import "server-only";
import type { Actor } from "@/server/auth/actor";
import { db } from "@/server/db";

/** Notifications belong to their recipient; no permission beyond being signed in. */
export async function countUnreadNotifications(actor: Actor): Promise<number> {
  return db.notification.count({ where: { recipientId: actor.userId, readAt: null } });
}

export async function listNotifications(actor: Actor, limit = 50) {
  return db.notification.findMany({
    where: { recipientId: actor.userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, type: true, title: true, body: true, href: true, readAt: true, createdAt: true },
  });
}

/** Scoped by recipient, so one user can never mark another's notifications. */
export async function markNotificationsRead(actor: Actor, ids: string[] | "all"): Promise<number> {
  const { count } = await db.notification.updateMany({
    where: { recipientId: actor.userId, readAt: null, ...(ids === "all" ? {} : { id: { in: ids } }) },
    data: { readAt: new Date() },
  });
  return count;
}
