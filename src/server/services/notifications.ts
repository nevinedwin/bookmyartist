import "server-only";
import type { Tx } from "@/server/db";
import type { Permission } from "@/server/auth/permissions";

/** Create an in-app notification for every active user holding `permission`. */
export async function notifyUsersWithPermission(
  tx: Tx,
  permission: Permission,
  notification: { type: string; title: string; body?: string; href?: string },
): Promise<number> {
  const recipients = await tx.user.findMany({
    where: { status: "ACTIVE", role: { permissions: { some: { permission: { key: permission } } } } },
    select: { id: true },
  });
  if (recipients.length === 0) return 0;
  await tx.notification.createMany({
    data: recipients.map((r) => ({ recipientId: r.id, ...notification })),
  });
  return recipients.length;
}
