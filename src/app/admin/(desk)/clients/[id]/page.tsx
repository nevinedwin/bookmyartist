import { ArrowLeft, Contact, Mail, MessageCircle, Phone, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EnquiryStatusBadge } from "@/components/desk/badges";
import { ArchiveClientButton, ClientEditForm } from "@/components/desk/clients/client-edit-form";
import { DuplicateList } from "@/components/desk/clients/duplicate-list";
import { EmptyState } from "@/components/desk/empty-state";
import { NoAccess } from "@/components/desk/no-access";
import { Skeleton } from "@/components/ui/skeleton";
import { CLIENT_TYPE_LABELS, EVENT_TYPE_LABELS } from "@/lib/labels";
import { formatCalendarDate, formatDate, formatDateTime } from "@/lib/time";
import { actorWith } from "@/server/auth/dal";
import { getClient } from "@/server/services/admin/clients";

export const metadata: Metadata = { title: "Client" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ClientPage({ params }: PageProps<"/admin/clients/[id]">) {
  return (
    <div className="grid gap-6">
      <Link href="/admin/clients" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Clients
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <ClientDetailView params={params} />
      </Suspense>
    </div>
  );
}

async function ClientDetailView({ params }: { params: PageProps<"/admin/clients/[id]">["params"] }) {
  const actor = await actorWith("client:read");
  if (!actor) return <NoAccess what="clients" />;
  const { id } = await params;
  const client = UUID.test(id) ? await getClient(actor, id) : null;
  if (!client) {
    return (
      <EmptyState icon={Contact} title="Client not found">
        The link may be wrong. <Link href="/admin/clients" className="text-primary underline">Back to clients</Link>
      </EmptyState>
    );
  }
  const whatsapp = client.phone?.replace(/\D/g, "");
  const s = (v: string | null) => v ?? "";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid min-w-0 content-start gap-6">
        <header className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {[CLIENT_TYPE_LABELS[client.type], client.organization, client.city].filter(Boolean).join(" · ")}
                {client.archivedAt ? ` · Archived ${formatDate(client.archivedAt)}` : ""}
              </p>
            </div>
            {client.permissions.write ? <ArchiveClientButton clientId={client.id} archived={client.archivedAt !== null} /> : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {client.email ? (
              <Chip href={`mailto:${client.email}`} icon={<Mail aria-hidden="true" />}>
                {client.email}
              </Chip>
            ) : null}
            {client.phone ? (
              <Chip href={`tel:${client.phone}`} icon={<Phone aria-hidden="true" />}>
                {client.phone}
              </Chip>
            ) : null}
            {whatsapp ? (
              <Chip href={`https://wa.me/${whatsapp}`} icon={<MessageCircle aria-hidden="true" />} external>
                WhatsApp
              </Chip>
            ) : null}
          </div>
          {client.possibleDuplicates.length ? (
            <div className="mt-4 grid gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950">
              <p className="flex items-center gap-2 text-sm font-medium">
                <TriangleAlert className="size-4" aria-hidden="true" /> Other client records share this email or phone
              </p>
              <DuplicateList matches={client.possibleDuplicates} />
            </div>
          ) : null}
        </header>

        <section className="rounded-xl border bg-card p-5" aria-label="Details">
          <h2 className="mb-4 font-medium">Details</h2>
          <ClientEditForm
            key={client.updatedAt.toISOString()}
            clientId={client.id}
            updatedAt={client.updatedAt.toISOString()}
            canEdit={client.permissions.write}
            initial={{
              name: client.name,
              email: s(client.email),
              phone: s(client.phone),
              organization: s(client.organization),
              type: client.type,
              addressLine1: s(client.addressLine1),
              addressLine2: s(client.addressLine2),
              city: s(client.city),
              state: s(client.state),
              postalCode: s(client.postalCode),
              taxId: s(client.taxId),
              notes: s(client.notes),
            }}
          />
        </section>
      </div>

      <aside className="grid content-start gap-4 lg:sticky lg:top-20 lg:self-start">
        {client.permissions.enquiries ? (
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-medium">Enquiries</h2>
            {client.enquiries.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">None linked yet. Link one from the enquiry&apos;s page.</p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {client.enquiries.map((e) => (
                  <li key={e.id}>
                    <Link href={`/admin/enquiries/${e.id}`} className="grid gap-1 rounded-md text-sm hover:underline">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs">{e.reference}</span>
                        <EnquiryStatusBadge status={e.status} />
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {EVENT_TYPE_LABELS[e.eventType]} · {formatCalendarDate(e.eventDate)} · {e.eventCity}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
        <p className="px-1 text-xs text-muted-foreground">
          Added {formatDateTime(client.createdAt)}
          {client.createdBy ? ` by ${client.createdBy}` : ""} · Updated {formatDateTime(client.updatedAt)}
        </p>
      </aside>
    </div>
  );
}

function Chip({ href, icon, external, children }: { href: string; icon: React.ReactNode; external?: boolean; children: React.ReactNode }) {
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-busy="true" aria-label="Loading client">
      <div className="grid gap-6">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
