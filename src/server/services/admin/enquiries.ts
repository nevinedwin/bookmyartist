import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ActivityType, EnquiryStatus, LostReason, Priority } from "@/generated/prisma/enums";
import { ENQUIRY_STATUS_LABELS, LOST_REASON_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import { businessDayEnd, businessLocalToUtc, formatDateTime } from "@/lib/time";
import { ENQUIRY_PAGE_SIZE, type EnquiryListParams } from "@/lib/validation/admin-enquiry";
import { type Actor, authorize, can } from "@/server/auth/actor";
import { db, type Tx } from "@/server/db";
import { CLOSED_ENQUIRY_STATUSES, ENQUIRY_PIPELINE, checkEnquiryTransition } from "@/server/domain/enquiry-status";
import { ServiceError, conflictError, notFoundError } from "../errors";

/*
 * Enquiry CRM. Visibility rule (owner decision, 2026-11-23): everyone holding
 * `enquiry:read` sees every enquiry; "mine" is a filter, not a permission.
 * Writes need `enquiry:write`; re-opening a closed enquiry needs `enquiry:reopen`.
 */

// ───────────────────────────── Reads ─────────────────────────────

const listSelect = {
  id: true,
  reference: true,
  status: true,
  priority: true,
  source: true,
  contactName: true,
  organization: true,
  eventType: true,
  eventDate: true,
  eventCity: true,
  budgetMinPaise: true,
  budgetMaxPaise: true,
  nextFollowUpAt: true,
  createdAt: true,
  owner: { select: { id: true, name: true } },
  category: { select: { name: true } },
  artists: { select: { artist: { select: { stageName: true } } }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.EnquirySelect;

type ListRow = Prisma.EnquiryGetPayload<{ select: typeof listSelect }>;

export interface EnquiryListItem {
  id: string;
  reference: string;
  status: EnquiryStatus;
  priority: Priority;
  contactName: string;
  organization: string | null;
  eventType: ListRow["eventType"];
  eventDate: Date;
  eventCity: string;
  budgetMin: string | null;
  budgetMax: string | null;
  nextFollowUpAt: Date | null;
  followUpDue: boolean;
  createdAt: Date;
  owner: { id: string; name: string } | null;
  categoryName: string | null;
  artistNames: string[];
}

function toListItem(row: ListRow, dueBefore: Date): EnquiryListItem {
  const open = !CLOSED_ENQUIRY_STATUSES.includes(row.status);
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    priority: row.priority,
    contactName: row.contactName,
    organization: row.organization,
    eventType: row.eventType,
    eventDate: row.eventDate,
    eventCity: row.eventCity,
    budgetMin: row.budgetMinPaise?.toString() ?? null,
    budgetMax: row.budgetMaxPaise?.toString() ?? null,
    nextFollowUpAt: row.nextFollowUpAt,
    followUpDue: open && !!row.nextFollowUpAt && row.nextFollowUpAt <= dueBefore,
    createdAt: row.createdAt,
    owner: row.owner,
    categoryName: row.category?.name ?? null,
    artistNames: row.artists.map((a) => a.artist.stageName),
  };
}

function buildWhere(actor: Actor, params: EnquiryListParams, now: Date): Prisma.EnquiryWhereInput {
  const and: Prisma.EnquiryWhereInput[] = [];
  if (params.status) and.push({ status: params.status });
  else if (!params.closed) and.push({ status: { notIn: [...CLOSED_ENQUIRY_STATUSES] } });

  if (params.owner === "me") and.push({ ownerId: actor.userId });
  else if (params.owner === "unassigned") and.push({ ownerId: null });
  else if (params.owner) and.push({ ownerId: params.owner });

  if (params.priority) and.push({ priority: params.priority });
  if (params.source) and.push({ source: params.source });
  if (params.followUp === "due") and.push({ nextFollowUpAt: { lte: businessDayEnd(now) } });
  if (params.followUp === "none") and.push({ nextFollowUpAt: null });

  if (params.q) {
    const q = params.q;
    const digits = q.replace(/\D/g, "");
    and.push({
      OR: [
        { reference: { contains: q, mode: "insensitive" } },
        { contactName: { contains: q, mode: "insensitive" } },
        { contactEmail: { contains: q.toLowerCase() } },
        { organization: { contains: q, mode: "insensitive" } },
        { eventCity: { contains: q, mode: "insensitive" } },
        ...(digits.length >= 4 ? [{ contactPhone: { contains: digits } }] : []),
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

export interface EnquiryPage {
  items: EnquiryListItem[];
  total: number;
  page: number;
  pageCount: number;
}

/** Table view. Follow-ups that are due float to the top, then newest first. */
export async function listEnquiries(actor: Actor, params: EnquiryListParams, now = new Date()): Promise<EnquiryPage> {
  authorize(actor, "enquiry:read");
  const where = buildWhere(actor, params, now);
  const page = params.page ?? 1;
  const [total, rows] = await Promise.all([
    db.enquiry.count({ where }),
    db.enquiry.findMany({
      where,
      select: listSelect,
      orderBy: [{ nextFollowUpAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      skip: (page - 1) * ENQUIRY_PAGE_SIZE,
      take: ENQUIRY_PAGE_SIZE,
    }),
  ]);
  const dueBefore = businessDayEnd(now);
  return {
    items: rows.map((r) => toListItem(r, dueBefore)),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ENQUIRY_PAGE_SIZE)),
  };
}

export const BOARD_COLUMN_LIMIT = 50;

export interface BoardColumn {
  status: EnquiryStatus;
  total: number;
  items: EnquiryListItem[];
}

/** Kanban view: one column per pipeline status, using the same filters (except status). */
export async function getEnquiryBoard(actor: Actor, params: EnquiryListParams, now = new Date()): Promise<BoardColumn[]> {
  authorize(actor, "enquiry:read");
  const statuses = params.closed ? ENQUIRY_PIPELINE : ENQUIRY_PIPELINE.filter((s) => !CLOSED_ENQUIRY_STATUSES.includes(s));
  const base = buildWhere(actor, { ...params, status: undefined, closed: "1" }, now);
  const dueBefore = businessDayEnd(now);
  return Promise.all(
    statuses.map(async (status) => {
      const where: Prisma.EnquiryWhereInput = { AND: [base, { status }] };
      const [total, rows] = await Promise.all([
        db.enquiry.count({ where }),
        db.enquiry.findMany({
          where,
          select: listSelect,
          orderBy: [{ nextFollowUpAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
          take: BOARD_COLUMN_LIMIT,
        }),
      ]);
      return { status, total, items: rows.map((r) => toListItem(r, dueBefore)) };
    }),
  );
}

const detailSelect = {
  ...listSelect,
  contactEmail: true,
  contactPhone: true,
  venue: true,
  audienceSize: true,
  performanceType: true,
  performersCount: true,
  durationMinutes: true,
  additionalRequirements: true,
  message: true,
  sourcePath: true,
  sourceService: true,
  sourceArtist: { select: { stageName: true, slug: true } },
  lastContactedAt: true,
  lostReason: true,
  lostReasonNote: true,
  closedAt: true,
  updatedAt: true,
  client: { select: { id: true, name: true, email: true, phone: true, organization: true } },
  artists: {
    select: {
      role: true,
      artist: { select: { id: true, stageName: true, slug: true, category: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  },
  notes: {
    select: { id: true, body: true, isPinned: true, createdAt: true, author: { select: { id: true, name: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  },
  activities: {
    select: {
      id: true,
      type: true,
      summary: true,
      fromStatus: true,
      toStatus: true,
      occurredAt: true,
      actor: { select: { name: true } },
    },
    orderBy: { occurredAt: "desc" },
    take: 200,
  },
} satisfies Prisma.EnquirySelect;

export type EnquiryDetail = Omit<
  Prisma.EnquiryGetPayload<{ select: typeof detailSelect }>,
  "budgetMinPaise" | "budgetMaxPaise"
> & {
  budgetMin: string | null;
  budgetMax: string | null;
  followUpDue: boolean;
  permissions: { write: boolean; reopen: boolean };
};

export async function getEnquiry(actor: Actor, enquiryId: string, now = new Date()): Promise<EnquiryDetail | null> {
  authorize(actor, "enquiry:read");
  const row = await db.enquiry.findUnique({ where: { id: enquiryId }, select: detailSelect });
  if (!row) return null;
  const { budgetMinPaise, budgetMaxPaise, ...rest } = row;
  const open = !CLOSED_ENQUIRY_STATUSES.includes(row.status);
  return {
    ...rest,
    budgetMin: budgetMinPaise?.toString() ?? null,
    budgetMax: budgetMaxPaise?.toString() ?? null,
    followUpDue: open && !!row.nextFollowUpAt && row.nextFollowUpAt <= businessDayEnd(now),
    permissions: { write: can(actor, "enquiry:write"), reopen: can(actor, "enquiry:reopen") },
  };
}

export interface AssignableUser {
  id: string;
  name: string;
}

/** Active staff who can work enquiries (holders of `enquiry:write`). */
export async function listAssignableUsers(actor: Actor): Promise<AssignableUser[]> {
  authorize(actor, "enquiry:read");
  return db.user.findMany({
    where: {
      status: "ACTIVE",
      artistId: null,
      role: { permissions: { some: { permission: { key: "enquiry:write" } } } },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ───────────────────────────── Writes ─────────────────────────────

async function activity(
  tx: Tx,
  enquiryId: string,
  actor: Actor,
  type: ActivityType,
  summary: string,
  extra: Partial<Pick<Prisma.EnquiryActivityUncheckedCreateInput, "fromStatus" | "toStatus" | "metadata">> = {},
) {
  await tx.enquiryActivity.create({ data: { enquiryId, actorId: actor.userId, type, summary, ...extra } });
}

async function loadForWrite(tx: Tx, enquiryId: string) {
  const enquiry = await tx.enquiry.findUnique({
    where: { id: enquiryId },
    select: { id: true, status: true, ownerId: true, priority: true, nextFollowUpAt: true },
  });
  if (!enquiry) throw notFoundError("Enquiry");
  return enquiry;
}

/**
 * Move an enquiry through the pipeline. `from` is the status the user saw;
 * if someone else changed it meanwhile the update is refused instead of
 * silently overwriting their change (optimistic concurrency).
 */
export async function changeEnquiryStatus(
  actor: Actor,
  input: { enquiryId: string; from: EnquiryStatus; to: EnquiryStatus; lostReason?: LostReason; lostReasonNote?: string },
  now = new Date(),
): Promise<void> {
  authorize(actor, "enquiry:write");
  const check = checkEnquiryTransition(input.from, input.to);
  if (!check.ok) throw new ServiceError("invalid_transition", check.reason);
  if (check.requiresReopenPermission) authorize(actor, "enquiry:reopen");
  if (check.requiresLostReason && !input.lostReason) {
    throw new ServiceError("lost_reason_required", "Choose why it was lost.", { lostReason: ["Choose why it was lost."] });
  }

  const closing = CLOSED_ENQUIRY_STATUSES.includes(input.to);
  await db.$transaction(async (tx) => {
    const { count } = await tx.enquiry.updateMany({
      where: { id: input.enquiryId, status: input.from },
      data: {
        status: input.to,
        updatedById: actor.userId,
        closedAt: closing ? now : null,
        lostReason: input.to === "LOST" ? input.lostReason : null,
        lostReasonNote: input.to === "LOST" ? input.lostReasonNote || null : null,
        ...(closing ? { nextFollowUpAt: null } : {}),
      },
    });
    if (count === 0) {
      const exists = await tx.enquiry.count({ where: { id: input.enquiryId } });
      if (!exists) throw notFoundError("Enquiry");
      throw conflictError("Someone else changed this enquiry's status. Refresh to see the latest.");
    }
    const reason = input.to === "LOST" && input.lostReason ? ` — ${LOST_REASON_LABELS[input.lostReason]}` : "";
    await activity(
      tx,
      input.enquiryId,
      actor,
      "STATUS_CHANGED",
      `${ENQUIRY_STATUS_LABELS[input.from]} → ${ENQUIRY_STATUS_LABELS[input.to]}${reason}`,
      { fromStatus: input.from, toStatus: input.to },
    );
  });
}

export async function assignEnquiryOwner(actor: Actor, input: { enquiryId: string; ownerId: string | null }): Promise<void> {
  authorize(actor, "enquiry:write");
  await db.$transaction(async (tx) => {
    const enquiry = await loadForWrite(tx, input.enquiryId);
    if (enquiry.ownerId === input.ownerId) return;
    let ownerName = "nobody";
    if (input.ownerId) {
      const owner = await tx.user.findFirst({
        where: {
          id: input.ownerId,
          status: "ACTIVE",
          role: { permissions: { some: { permission: { key: "enquiry:write" } } } },
        },
        select: { id: true, name: true },
      });
      if (!owner) throw new ServiceError("invalid_owner", "That person can't own enquiries.", { ownerId: ["Choose an active team member."] });
      ownerName = owner.name;
    }
    await tx.enquiry.update({ where: { id: enquiry.id }, data: { ownerId: input.ownerId, updatedById: actor.userId } });
    await activity(tx, enquiry.id, actor, "ASSIGNED", input.ownerId ? `Assigned to ${ownerName}` : "Unassigned");
    if (input.ownerId && input.ownerId !== actor.userId) {
      const ref = await tx.enquiry.findUniqueOrThrow({ where: { id: enquiry.id }, select: { reference: true, contactName: true } });
      await tx.notification.create({
        data: {
          recipientId: input.ownerId,
          type: "enquiry.assigned",
          title: `${actor.name} assigned you ${ref.reference}`,
          body: ref.contactName,
          href: `/admin/enquiries/${enquiry.id}`,
        },
      });
    }
  });
}

export async function setEnquiryPriority(actor: Actor, input: { enquiryId: string; priority: Priority }): Promise<void> {
  authorize(actor, "enquiry:write");
  await db.$transaction(async (tx) => {
    const enquiry = await loadForWrite(tx, input.enquiryId);
    if (enquiry.priority === input.priority) return;
    await tx.enquiry.update({ where: { id: enquiry.id }, data: { priority: input.priority, updatedById: actor.userId } });
    await activity(
      tx,
      enquiry.id,
      actor,
      "UPDATED",
      `Priority ${PRIORITY_LABELS[enquiry.priority]} → ${PRIORITY_LABELS[input.priority]}`,
    );
  });
}

/** `at` is a business-timezone datetime-local string, or null to clear. */
export async function setEnquiryFollowUp(actor: Actor, input: { enquiryId: string; at: string | null }): Promise<void> {
  authorize(actor, "enquiry:write");
  const at = input.at ? businessLocalToUtc(input.at) : null;
  await db.$transaction(async (tx) => {
    const enquiry = await loadForWrite(tx, input.enquiryId);
    if (at && CLOSED_ENQUIRY_STATUSES.includes(enquiry.status)) {
      throw new ServiceError("closed", "Re-open the enquiry before scheduling a follow-up.");
    }
    await tx.enquiry.update({ where: { id: enquiry.id }, data: { nextFollowUpAt: at, updatedById: actor.userId } });
    await activity(tx, enquiry.id, actor, "FOLLOW_UP_SET", at ? `Follow-up set for ${formatDateTime(at)}` : "Follow-up cleared");
  });
}

export async function addEnquiryNote(actor: Actor, input: { enquiryId: string; body: string }): Promise<void> {
  authorize(actor, "enquiry:write");
  await db.$transaction(async (tx) => {
    const enquiry = await loadForWrite(tx, input.enquiryId);
    await tx.enquiryNote.create({ data: { enquiryId: enquiry.id, authorId: actor.userId, body: input.body } });
    const preview = input.body.length > 80 ? `${input.body.slice(0, 77)}…` : input.body;
    await activity(tx, enquiry.id, actor, "NOTE_ADDED", `Note: ${preview}`);
  });
}

export async function setNotePinned(actor: Actor, input: { noteId: string; pinned: boolean }): Promise<string> {
  authorize(actor, "enquiry:write");
  const note = await db.enquiryNote.findUnique({ where: { id: input.noteId }, select: { enquiryId: true } });
  if (!note) throw notFoundError("Note");
  await db.enquiryNote.update({ where: { id: input.noteId }, data: { isPinned: input.pinned } });
  return note.enquiryId;
}

const CONTACT_VERBS: Record<"CALL" | "EMAIL" | "WHATSAPP" | "MEETING", string> = {
  CALL: "Call",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  MEETING: "Meeting",
};

/**
 * Log a customer conversation. The first logged contact on a NEW enquiry
 * moves it to CONTACTED automatically (recorded as its own timeline entry).
 */
export async function logEnquiryContact(
  actor: Actor,
  input: { enquiryId: string; type: "CALL" | "EMAIL" | "WHATSAPP" | "MEETING"; summary: string },
  now = new Date(),
): Promise<{ movedToContacted: boolean }> {
  authorize(actor, "enquiry:write");
  return db.$transaction(async (tx) => {
    const enquiry = await loadForWrite(tx, input.enquiryId);
    await activity(tx, enquiry.id, actor, input.type, `${CONTACT_VERBS[input.type]}: ${input.summary}`);
    await tx.enquiry.update({ where: { id: enquiry.id }, data: { lastContactedAt: now, updatedById: actor.userId } });
    // Conditional update, so a concurrent status change is never overwritten.
    const { count } = await tx.enquiry.updateMany({
      where: { id: enquiry.id, status: "NEW" },
      data: { status: "CONTACTED" },
    });
    const moved = count > 0;
    if (moved) {
      await activity(tx, enquiry.id, actor, "STATUS_CHANGED", "New → Contacted (first contact logged)", {
        fromStatus: "NEW",
        toStatus: "CONTACTED",
      });
    }
    return { movedToContacted: moved };
  });
}
