import "server-only";
import type { EnquiryStatus } from "@/generated/prisma/enums";
import { type Actor, authorize } from "@/server/auth/actor";
import { db } from "@/server/db";
import { CLOSED_ENQUIRY_STATUSES, ENQUIRY_PIPELINE } from "@/server/domain/enquiry-status";
import { businessDayEnd, businessDayStart, businessToday, calendarDateToUtc } from "@/lib/time";

export interface EnquiryOverview {
  newLast7Days: number;
  open: number;
  unassigned: number;
  mine: number;
  followUpsDue: number;
  eventsNext30Days: number;
  pipeline: { status: EnquiryStatus; count: number }[];
}

/** Every number here is a live count from the database — nothing estimated or sampled. */
export async function getEnquiryOverview(actor: Actor, now = new Date()): Promise<EnquiryOverview> {
  authorize(actor, "enquiry:read");
  const open = { status: { notIn: [...CLOSED_ENQUIRY_STATUSES] } };
  const sevenDaysAgo = new Date(businessDayStart(now).getTime() - 6 * 86_400_000);
  const todayUtc = calendarDateToUtc(businessToday(now));
  const in30Days = new Date(todayUtc.getTime() + 30 * 86_400_000);

  const [newLast7Days, openCount, unassigned, mine, followUpsDue, eventsNext30Days, grouped] = await Promise.all([
    db.enquiry.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    db.enquiry.count({ where: open }),
    db.enquiry.count({ where: { ...open, ownerId: null } }),
    db.enquiry.count({ where: { ...open, ownerId: actor.userId } }),
    db.enquiry.count({ where: { ...open, nextFollowUpAt: { lte: businessDayEnd(now) } } }),
    db.enquiry.count({ where: { ...open, eventDate: { gte: todayUtc, lte: in30Days } } }),
    db.enquiry.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));
  return {
    newLast7Days,
    open: openCount,
    unassigned,
    mine,
    followUpsDue,
    eventsNext30Days,
    pipeline: ENQUIRY_PIPELINE.map((status) => ({ status, count: counts.get(status) ?? 0 })),
  };
}

export async function getRecentEnquiries(actor: Actor, limit = 6) {
  authorize(actor, "enquiry:read");
  return db.enquiry.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      reference: true,
      status: true,
      contactName: true,
      eventType: true,
      eventDate: true,
      eventCity: true,
      createdAt: true,
      owner: { select: { name: true } },
    },
  });
}
