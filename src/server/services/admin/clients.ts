import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ClientType, EnquiryStatus, EventType } from "@/generated/prisma/enums";
import { CLIENT_PAGE_SIZE, type ClientListParams, type CreateClientInput, type UpdateClientInput } from "@/lib/validation/clients";
import { type Actor, authorize, can } from "@/server/auth/actor";
import { db, type Tx } from "@/server/db";
import { CLOSED_ENQUIRY_STATUSES } from "@/server/domain/enquiry-status";
import { conflictError, notFoundError } from "../errors";

/*
 * Clients: the people and organisations who book. Everyone with `client:read`
 * sees every client (same rule as enquiries, ADR-018). Enquiries keep the
 * contact details exactly as submitted; linking an enquiry to a client never
 * rewrites that snapshot.
 */

// ───────────────────────────── Reads ─────────────────────────────

export interface ClientListItem {
  id: string;
  name: string;
  organization: string | null;
  type: ClientType;
  email: string | null;
  phone: string | null;
  city: string | null;
  archived: boolean;
  enquiryCount: number;
  openEnquiryCount: number;
  createdAt: Date;
}

export interface ClientPage {
  items: ClientListItem[];
  total: number;
  page: number;
  pageCount: number;
}

function searchWhere(q: string): Prisma.ClientWhereInput {
  const digits = q.replace(/\D/g, "");
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { organization: { contains: q, mode: "insensitive" } },
      { email: { contains: q.toLowerCase() } },
      { city: { contains: q, mode: "insensitive" } },
      ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
    ],
  };
}

const listSelect = {
  id: true,
  name: true,
  organization: true,
  type: true,
  email: true,
  phone: true,
  city: true,
  archivedAt: true,
  createdAt: true,
  _count: { select: { enquiries: true } },
} satisfies Prisma.ClientSelect;

export async function listClients(actor: Actor, params: ClientListParams): Promise<ClientPage> {
  authorize(actor, "client:read");
  const and: Prisma.ClientWhereInput[] = [params.archived ? { archivedAt: { not: null } } : { archivedAt: null }];
  if (params.type) and.push({ type: params.type });
  if (params.q) and.push(searchWhere(params.q));
  const where = { AND: and };
  const page = params.page ?? 1;
  const [total, rows] = await Promise.all([
    db.client.count({ where }),
    db.client.findMany({
      where,
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * CLIENT_PAGE_SIZE,
      take: CLIENT_PAGE_SIZE,
      select: listSelect,
    }),
  ]);
  const ids = rows.map((r) => r.id);
  const open = ids.length
    ? await db.enquiry.groupBy({
        by: ["clientId"],
        where: { clientId: { in: ids }, status: { notIn: [...CLOSED_ENQUIRY_STATUSES] } },
        _count: { _all: true },
      })
    : [];
  const openById = new Map(open.map((o) => [o.clientId, o._count._all]));
  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      organization: r.organization,
      type: r.type,
      email: r.email,
      phone: r.phone,
      city: r.city,
      archived: r.archivedAt !== null,
      enquiryCount: r._count.enquiries,
      openEnquiryCount: openById.get(r.id) ?? 0,
      createdAt: r.createdAt,
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / CLIENT_PAGE_SIZE)),
  };
}

export interface ClientMatch {
  id: string;
  name: string;
  organization: string | null;
  email: string | null;
  phone: string | null;
  archived: boolean;
  matchedOn: ("email" | "phone")[];
}

/** Exact email / phone matches — the signals strong enough to call a duplicate. */
async function findMatches(tx: Tx | typeof db, contact: { email: string | null; phone: string | null }, exceptId?: string): Promise<ClientMatch[]> {
  const or: Prisma.ClientWhereInput[] = [];
  if (contact.email) or.push({ email: contact.email.toLowerCase() });
  if (contact.phone) or.push({ phone: contact.phone });
  if (!or.length) return [];
  const rows = await tx.client.findMany({
    where: { OR: or, ...(exceptId ? { id: { not: exceptId } } : {}) },
    orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
    take: 10,
    select: { id: true, name: true, organization: true, email: true, phone: true, archivedAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    organization: r.organization,
    email: r.email,
    phone: r.phone,
    archived: r.archivedAt !== null,
    matchedOn: [
      ...(contact.email && r.email === contact.email.toLowerCase() ? (["email"] as const) : []),
      ...(contact.phone && r.phone === contact.phone ? (["phone"] as const) : []),
    ],
  }));
}

export interface ClientOption {
  id: string;
  name: string;
  organization: string | null;
  email: string | null;
  phone: string | null;
}

/** Typeahead for linking an enquiry to a client. Active clients only. */
export async function searchClients(actor: Actor, q: string, limit = 8): Promise<ClientOption[]> {
  authorize(actor, "client:read");
  return db.client.findMany({
    where: { AND: [{ archivedAt: null }, searchWhere(q)] },
    orderBy: { name: "asc" },
    take: limit,
    select: { id: true, name: true, organization: true, email: true, phone: true },
  });
}

export interface ClientDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
  type: ClientType;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  taxId: string | null;
  notes: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  enquiries: {
    id: string;
    reference: string;
    status: EnquiryStatus;
    eventType: EventType;
    eventDate: Date;
    eventCity: string;
    createdAt: Date;
  }[];
  /** Other client records sharing this email or phone. */
  possibleDuplicates: ClientMatch[];
  permissions: { write: boolean; enquiries: boolean };
}

export async function getClient(actor: Actor, clientId: string): Promise<ClientDetail | null> {
  authorize(actor, "client:read");
  const showEnquiries = can(actor, "enquiry:read");
  const row = await db.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      organization: true,
      type: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      taxId: true,
      notes: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
      enquiries: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, reference: true, status: true, eventType: true, eventDate: true, eventCity: true, createdAt: true },
      },
    },
  });
  if (!row) return null;
  const [creator, possibleDuplicates] = await Promise.all([
    row.createdById ? db.user.findUnique({ where: { id: row.createdById }, select: { name: true } }) : null,
    findMatches(db, row, row.id),
  ]);
  const { enquiries, ...rest } = row;
  return {
    id: rest.id,
    name: rest.name,
    email: rest.email,
    phone: rest.phone,
    organization: rest.organization,
    type: rest.type,
    addressLine1: rest.addressLine1,
    addressLine2: rest.addressLine2,
    city: rest.city,
    state: rest.state,
    postalCode: rest.postalCode,
    country: rest.country,
    taxId: rest.taxId,
    notes: rest.notes,
    archivedAt: rest.archivedAt,
    createdAt: rest.createdAt,
    updatedAt: rest.updatedAt,
    createdBy: creator?.name ?? null,
    enquiries: showEnquiries ? enquiries : [],
    possibleDuplicates,
    permissions: { write: can(actor, "client:write"), enquiries: showEnquiries },
  };
}

// ───────────────────────────── Writes ─────────────────────────────

function clientData(input: Omit<CreateClientInput, "allowDuplicate"> | UpdateClientInput) {
  return {
    name: input.name,
    email: input.email,
    phone: input.phone,
    organization: input.organization,
    type: input.type,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    taxId: input.taxId,
    notes: input.notes,
  };
}

export type CreateClientResult = { created: true; id: string } | { created: false; duplicates: ClientMatch[] };

/**
 * Creating a client whose email or phone already exists returns the matches
 * instead, so staff can open the existing record. They can still create it
 * (e.g. two people sharing an office number) by confirming.
 */
export async function createClient(actor: Actor, input: CreateClientInput): Promise<CreateClientResult> {
  authorize(actor, "client:write");
  return db.$transaction(async (tx) => {
    if (!input.allowDuplicate) {
      const duplicates = await findMatches(tx, input);
      if (duplicates.length) return { created: false, duplicates };
    }
    const client = await tx.client.create({
      data: { ...clientData(input), createdById: actor.userId, updatedById: actor.userId },
      select: { id: true },
    });
    return { created: true, id: client.id };
  });
}

export async function updateClient(actor: Actor, input: UpdateClientInput): Promise<void> {
  authorize(actor, "client:write");
  const { count } = await db.client.updateMany({
    where: { id: input.clientId, updatedAt: new Date(input.expectedUpdatedAt) },
    data: { ...clientData(input), updatedById: actor.userId },
  });
  if (count === 0) {
    const exists = await db.client.count({ where: { id: input.clientId } });
    if (!exists) throw notFoundError("Client");
    throw conflictError("Someone else saved this client while you were editing. Reload to see their changes.");
  }
}

/** Archiving hides a client from lists and pickers; history stays linked. */
export async function setClientArchived(actor: Actor, input: { clientId: string; archived: boolean }, now = new Date()): Promise<void> {
  authorize(actor, "client:write");
  const exists = await db.client.count({ where: { id: input.clientId } });
  if (!exists) throw notFoundError("Client");
  await db.client.update({
    where: { id: input.clientId },
    data: { archivedAt: input.archived ? now : null, updatedById: actor.userId },
  });
}

// ─────────────────────── Enquiry ↔ client linking ───────────────────────

async function enquiryActivity(tx: Tx, enquiryId: string, actor: Actor, summary: string) {
  await tx.enquiryActivity.create({ data: { enquiryId, actorId: actor.userId, type: "UPDATED", summary } });
}

/** Clients whose email or phone exactly matches what the customer submitted. */
export async function getEnquiryClientSuggestions(actor: Actor, enquiryId: string): Promise<ClientMatch[]> {
  authorize(actor, "client:read");
  const enquiry = await db.enquiry.findUnique({ where: { id: enquiryId }, select: { contactEmail: true, contactPhone: true, clientId: true } });
  if (!enquiry || enquiry.clientId) return [];
  const matches = await findMatches(db, { email: enquiry.contactEmail, phone: enquiry.contactPhone });
  return matches.filter((m) => !m.archived);
}

export async function linkEnquiryClient(actor: Actor, input: { enquiryId: string; clientId: string | null }): Promise<void> {
  authorize(actor, "enquiry:write");
  authorize(actor, "client:read");
  await db.$transaction(async (tx) => {
    const enquiry = await tx.enquiry.findUnique({ where: { id: input.enquiryId }, select: { id: true, clientId: true } });
    if (!enquiry) throw notFoundError("Enquiry");
    if (enquiry.clientId === input.clientId) return;
    let summary = "Client unlinked";
    if (input.clientId) {
      const client = await tx.client.findFirst({ where: { id: input.clientId, archivedAt: null }, select: { name: true } });
      if (!client) throw notFoundError("Client");
      summary = `Linked to client ${client.name}`;
    }
    await tx.enquiry.update({ where: { id: enquiry.id }, data: { clientId: input.clientId, updatedById: actor.userId } });
    await enquiryActivity(tx, enquiry.id, actor, summary);
  });
}

/** New client from the details the customer submitted, linked to the enquiry. */
export async function createClientFromEnquiry(actor: Actor, input: { enquiryId: string }): Promise<{ clientId: string }> {
  authorize(actor, "enquiry:write");
  authorize(actor, "client:write");
  return db.$transaction(async (tx) => {
    const enquiry = await tx.enquiry.findUnique({
      where: { id: input.enquiryId },
      select: { id: true, clientId: true, contactName: true, contactEmail: true, contactPhone: true, organization: true, eventType: true },
    });
    if (!enquiry) throw notFoundError("Enquiry");
    if (enquiry.clientId) throw conflictError("This enquiry is already linked to a client.");
    const type: ClientType =
      enquiry.eventType === "CORPORATE" || enquiry.eventType === "BRAND_ACTIVATION"
        ? "CORPORATE"
        : enquiry.eventType === "COLLEGE_FESTIVAL"
          ? "COLLEGE"
          : "INDIVIDUAL";
    const client = await tx.client.create({
      data: {
        name: enquiry.contactName,
        email: enquiry.contactEmail.toLowerCase(),
        phone: enquiry.contactPhone,
        organization: enquiry.organization,
        type,
        createdById: actor.userId,
        updatedById: actor.userId,
      },
      select: { id: true, name: true },
    });
    await tx.enquiry.update({ where: { id: enquiry.id }, data: { clientId: client.id, updatedById: actor.userId } });
    await enquiryActivity(tx, enquiry.id, actor, `Created client ${client.name} from this enquiry`);
    return { clientId: client.id };
  });
}
