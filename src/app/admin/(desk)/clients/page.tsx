import { Contact } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CreateClientDialog } from "@/components/desk/clients/create-client-dialog";
import { EmptyState } from "@/components/desk/empty-state";
import { ListFilters } from "@/components/desk/list-filters";
import { NoAccess } from "@/components/desk/no-access";
import { PageHeader } from "@/components/desk/page-header";
import { Pagination } from "@/components/desk/pagination";
import { toQuery } from "@/components/desk/query";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CLIENT_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import { CLIENT_PAGE_SIZE, clientListParamsSchema } from "@/lib/validation/clients";
import { can } from "@/server/auth/actor";
import { actorWith } from "@/server/auth/dal";
import { listClients } from "@/server/services/admin/clients";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage({ searchParams }: PageProps<"/admin/clients">) {
  return (
    <div className="grid gap-5">
      <Suspense fallback={<ListSkeleton />}>
        <Clients searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Clients({ searchParams }: { searchParams: PageProps<"/admin/clients">["searchParams"] }) {
  const actor = await actorWith("client:read");
  if (!actor) return <NoAccess what="clients" />;
  const raw = await searchParams;
  const params = clientListParamsSchema.parse(raw);
  const result = await listClients(actor, params);
  const filtered = Boolean(params.q || params.type);

  return (
    <>
      <PageHeader
        title="Clients"
        description="People and organisations who book. Link enquiries to clients to see their full history."
        actions={can(actor, "client:write") ? <CreateClientDialog /> : null}
      />
      <ListFilters
        searchLabel="Search clients"
        placeholder="Name, organisation, email, phone, city…"
        selects={[{ key: "type", label: "Type", allLabel: "All types", options: Object.entries(CLIENT_TYPE_LABELS).map(([value, label]) => ({ value, label })) }]}
        toggles={[{ key: "archived", label: "Archived" }]}
      />
      {result.total === 0 ? (
        <EmptyState icon={Contact} title={filtered ? "No clients match these filters" : params.archived ? "No archived clients" : "No clients yet"}>
          {filtered
            ? "Try a different search or clear the filters."
            : "Create clients here, or from an enquiry's page with one click."}
        </EmptyState>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table className="min-w-[720px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[32%]">Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Enquiries</TableHead>
                  <TableHead className="text-right">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((c) => (
                  <TableRow key={c.id} className="relative">
                    <TableCell>
                      <Link
                        href={`/admin/clients/${c.id}`}
                        className="font-medium after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:ring-2 after:focus-visible:ring-ring after:focus-visible:ring-inset"
                      >
                        {c.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{[c.organization, c.city].filter(Boolean).join(" · ") || "—"}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      <p className="truncate">{c.email ?? <span className="text-muted-foreground">No email</span>}</p>
                      <p className="text-xs text-muted-foreground">{c.phone ?? "No phone"}</p>
                    </TableCell>
                    <TableCell className="text-sm">{CLIENT_TYPE_LABELS[c.type]}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {c.enquiryCount}
                      {c.openEnquiryCount ? <span className="block text-xs text-muted-foreground">{c.openEnquiryCount} open</span> : null}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            pageSize={CLIENT_PAGE_SIZE}
            hrefFor={(page) => `/admin/clients${toQuery(raw, { page: page > 1 ? String(page) : null })}`}
          />
        </>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading clients">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
