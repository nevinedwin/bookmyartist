import { AlarmClock, ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { EnquiryStatusBadge, PriorityLabel } from "@/components/desk/badges";
import { ContactLogForm, NoteForm, PinNoteButton } from "@/components/desk/enquiries/activity-forms";
import { PipelinePanel } from "@/components/desk/enquiries/pipeline-panel";
import { EmptyState } from "@/components/desk/empty-state";
import { formatBudget } from "@/components/desk/format";
import { NoAccess } from "@/components/desk/no-access";
import { Skeleton } from "@/components/ui/skeleton";
import { ENQUIRY_SOURCE_LABELS, ENQUIRY_STATUS_LABELS, EVENT_TYPE_LABELS, LOST_REASON_LABELS } from "@/lib/labels";
import { formatCalendarDate, formatDateTime, utcToBusinessLocal } from "@/lib/time";
import { actorWith } from "@/server/auth/dal";
import { allowedEnquiryTransitions, isClosedEnquiry } from "@/server/domain/enquiry-status";
import { getEnquiry, listAssignableUsers } from "@/server/services/admin/enquiries";

export const metadata: Metadata = { title: "Enquiry" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EnquiryPage({ params }: PageProps<"/admin/enquiries/[id]">) {
  return (
    <div className="grid gap-6">
      <Link href="/admin/enquiries" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Enquiries
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <EnquiryDetailView params={params} />
      </Suspense>
    </div>
  );
}

async function EnquiryDetailView({ params }: { params: PageProps<"/admin/enquiries/[id]">["params"] }) {
  const actor = await actorWith("enquiry:read");
  if (!actor) return <NoAccess what="enquiries" />;
  const { id } = await params;
  const enquiry = UUID.test(id) ? await getEnquiry(actor, id) : null;
  if (!enquiry) {
    return (
      <EmptyState icon={AlarmClock} title="Enquiry not found">
        It may have been removed, or the link is wrong. <Link href="/admin/enquiries" className="text-primary underline">Back to enquiries</Link>
      </EmptyState>
    );
  }

  const users = enquiry.permissions.write ? await listAssignableUsers(actor) : [];
  const closed = isClosedEnquiry(enquiry.status);
  const transitions = closed && !enquiry.permissions.reopen ? [] : [...allowedEnquiryTransitions(enquiry.status)];
  const budget = formatBudget(enquiry.budgetMin, enquiry.budgetMax);
  const whatsapp = enquiry.contactPhone.replace(/\D/g, "");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid min-w-0 content-start gap-6">
        <header className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{enquiry.reference}</span>
            <span aria-hidden="true">·</span>
            <span>Received {formatDateTime(enquiry.createdAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{ENQUIRY_SOURCE_LABELS[enquiry.source]}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{enquiry.contactName}</h1>
            <EnquiryStatusBadge status={enquiry.status} />
            <PriorityLabel priority={enquiry.priority} />
          </div>
          {enquiry.organization ? <p className="mt-1 text-sm text-muted-foreground">{enquiry.organization}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <ContactChip href={`mailto:${enquiry.contactEmail}`} icon={<Mail aria-hidden="true" />}>
              {enquiry.contactEmail}
            </ContactChip>
            <ContactChip href={`tel:${enquiry.contactPhone}`} icon={<Phone aria-hidden="true" />}>
              {enquiry.contactPhone}
            </ContactChip>
            {whatsapp ? (
              <ContactChip href={`https://wa.me/${whatsapp}`} icon={<MessageCircle aria-hidden="true" />} external>
                WhatsApp
              </ContactChip>
            ) : null}
          </div>
          {enquiry.followUpDue && enquiry.nextFollowUpAt ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800">
              <AlarmClock className="size-4" aria-hidden="true" /> Follow-up due {formatDateTime(enquiry.nextFollowUpAt)}
            </p>
          ) : null}
          {enquiry.status === "LOST" && enquiry.lostReason ? (
            <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">
              Lost: <strong>{LOST_REASON_LABELS[enquiry.lostReason]}</strong>
              {enquiry.lostReasonNote ? ` — ${enquiry.lostReasonNote}` : ""}
            </p>
          ) : null}
        </header>

        <Section title="Event">
          <Facts
            items={[
              ["Event type", EVENT_TYPE_LABELS[enquiry.eventType]],
              ["Date", formatCalendarDate(enquiry.eventDate)],
              ["City", enquiry.eventCity],
              ["Venue", enquiry.venue],
              ["Audience", enquiry.audienceSize ? `${enquiry.audienceSize.toLocaleString("en-IN")} guests` : null],
              ["Budget", budget],
            ]}
          />
        </Section>

        <Section title="Entertainment">
          <Facts
            items={[
              ["Category", enquiry.category?.name ?? null],
              ["Performance", enquiry.performanceType],
              ["Performers", enquiry.performersCount ? String(enquiry.performersCount) : null],
              ["Duration", enquiry.durationMinutes ? `${enquiry.durationMinutes} min` : null],
            ]}
          />
          {enquiry.artists.length ? (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase">Artists</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {enquiry.artists.map((a) => (
                  <li key={a.artist.id} className="rounded-full border px-3 py-1 text-sm">
                    <a href={`/artists/${a.artist.slug}`} target="_blank" rel="noreferrer" className="hover:underline">
                      {a.artist.stageName}
                    </a>
                    <span className="text-muted-foreground"> · {a.role === "PREFERRED" ? "Customer's choice" : a.role.toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {enquiry.additionalRequirements ? <Prose label="Requirements">{enquiry.additionalRequirements}</Prose> : null}
          {enquiry.message ? <Prose label="Message from the customer">{enquiry.message}</Prose> : null}
        </Section>

        <Section title="Notes" description="Internal only.">
          {enquiry.permissions.write ? <NoteForm enquiryId={enquiry.id} /> : null}
          {enquiry.notes.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {enquiry.notes.map((n) => (
                <li key={n.id} className={n.isPinned ? "rounded-lg border border-primary/30 bg-primary/[0.03] p-3" : "rounded-lg border p-3"}>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      <span className="font-medium text-foreground">{n.author.name}</span> · {formatDateTime(n.createdAt)}
                      {n.isPinned ? " · Pinned" : ""}
                    </span>
                    {enquiry.permissions.write ? <PinNoteButton noteId={n.id} pinned={n.isPinned} /> : null}
                  </div>
                  <p className="mt-1.5 text-sm whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Timeline">
          <ol className="relative grid gap-4 border-l pl-5">
            {enquiry.activities.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full border-2 border-background bg-primary/60" aria-hidden="true" />
                <p className="text-sm">{a.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(a.occurredAt)} · {a.actor?.name ?? "Website"}
                </p>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      <aside className="grid content-start gap-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 font-medium">Pipeline</h2>
          {enquiry.permissions.write ? (
            <PipelinePanel
              key={`${enquiry.status}:${enquiry.updatedAt.toISOString()}`}
              enquiryId={enquiry.id}
              status={enquiry.status}
              transitions={transitions}
              ownerId={enquiry.owner?.id ?? null}
              users={users}
              priority={enquiry.priority}
              followUpLocal={enquiry.nextFollowUpAt ? utcToBusinessLocal(enquiry.nextFollowUpAt) : null}
              closed={closed}
            />
          ) : (
            <Facts
              items={[
                ["Status", ENQUIRY_STATUS_LABELS[enquiry.status]],
                ["Owner", enquiry.owner?.name ?? "Unassigned"],
                ["Follow-up", enquiry.nextFollowUpAt ? formatDateTime(enquiry.nextFollowUpAt) : null],
              ]}
            />
          )}
        </div>
        {enquiry.permissions.write && !closed ? (
          <div className="rounded-xl border bg-card p-5">
            <ContactLogForm enquiryId={enquiry.id} isNew={enquiry.status === "NEW"} />
          </div>
        ) : null}
        <div className="rounded-xl border bg-card p-5 text-sm">
          <Facts
            items={[
              ["Last contacted", enquiry.lastContactedAt ? formatDateTime(enquiry.lastContactedAt) : "Not yet"],
              ["Submitted from", enquiry.sourcePath],
              ["Updated", formatDateTime(enquiry.updatedAt)],
            ]}
          />
        </div>
      </aside>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5" aria-label={title}>
      <h2 className="font-medium">{title}</h2>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Facts({ items }: { items: [string, string | null | undefined][] }) {
  const shown = items.filter(([, v]) => v);
  if (shown.length === 0) return <p className="text-sm text-muted-foreground">Not provided.</p>;
  return (
    <dl className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-4 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
      {shown.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Prose({ label, children }: { label: string; children: string }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
      <p className="mt-1.5 text-sm whitespace-pre-wrap">{children}</p>
    </div>
  );
}

function ContactChip({ href, icon, external, children }: { href: string; icon: ReactNode; external?: boolean; children: ReactNode }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm hover:bg-muted [&_svg]:size-3.5 [&_svg]:text-muted-foreground"
    >
      {icon}
      {children}
    </a>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-busy="true" aria-label="Loading enquiry">
      <div className="grid gap-6">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
