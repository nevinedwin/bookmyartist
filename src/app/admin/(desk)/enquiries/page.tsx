import { Inbox, KanbanSquare, Rows3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/desk/empty-state";
import { EnquiryBoard } from "@/components/desk/enquiries/enquiry-board";
import { EnquiryFilters } from "@/components/desk/enquiries/enquiry-filters";
import { EnquiryTable } from "@/components/desk/enquiries/enquiry-table";
import { NoAccess } from "@/components/desk/no-access";
import { PageHeader } from "@/components/desk/page-header";
import { Pagination } from "@/components/desk/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ENQUIRY_PAGE_SIZE, enquiryListParamsSchema } from "@/lib/validation/admin-enquiry";
import { actorWith } from "@/server/auth/dal";
import { getEnquiryBoard, listAssignableUsers, listEnquiries } from "@/server/services/admin/enquiries";

export const metadata: Metadata = { title: "Enquiries" };

export default function EnquiriesPage({ searchParams }: PageProps<"/admin/enquiries">) {
  return (
    <div className="grid gap-5">
      <Suspense fallback={<ListSkeleton />}>
        <Enquiries searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function toQuery(raw: Record<string, string | string[] | undefined>, overrides: Record<string, string | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string" && v) sp.set(k, v);
  for (const [k, v] of Object.entries(overrides)) {
    if (v) sp.set(k, v);
    else sp.delete(k);
  }
  return sp.size ? `?${sp}` : "";
}

async function Enquiries({ searchParams }: { searchParams: PageProps<"/admin/enquiries">["searchParams"] }) {
  const actor = await actorWith("enquiry:read");
  if (!actor) return <NoAccess what="enquiries" />;

  const raw = await searchParams;
  const params = enquiryListParamsSchema.parse(raw);
  const board = params.view === "board";
  const users = await listAssignableUsers(actor);

  const viewToggle = (
    <div className="inline-flex rounded-lg border bg-card p-0.5" role="group" aria-label="View">
      {[
        { view: null, label: "Table", icon: Rows3 },
        { view: "board", label: "Board", icon: KanbanSquare },
      ].map((v) => {
        const active = (v.view === "board") === board;
        return (
          <Link
            key={v.label}
            href={`/admin/enquiries${toQuery(raw, { view: v.view, page: null, status: v.view === "board" ? null : (params.status ?? null) })}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <v.icon className="size-3.5" aria-hidden="true" /> {v.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      <PageHeader title="Enquiries" description="Every enquiry from the website and the team, newest and most urgent first." actions={viewToggle} />
      <EnquiryFilters users={users} />
      {board ? <BoardView actor={actor} params={params} /> : <TableView actor={actor} params={params} raw={raw} />}
    </>
  );
}

type ViewProps = {
  actor: NonNullable<Awaited<ReturnType<typeof actorWith>>>;
  params: ReturnType<typeof enquiryListParamsSchema.parse>;
};

async function TableView({ actor, params, raw }: ViewProps & { raw: Record<string, string | string[] | undefined> }) {
  const result = await listEnquiries(actor, params);
  if (result.total === 0) {
    return (
      <EmptyState icon={Inbox} title={params.q || params.status || params.owner ? "No enquiries match these filters" : "No open enquiries"}>
        {params.closed ? "Try a different search or clear the filters." : "Closed enquiries are hidden — tick “Include closed” to see them."}
      </EmptyState>
    );
  }
  return (
    <>
      <EnquiryTable items={result.items} />
      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={ENQUIRY_PAGE_SIZE}
        hrefFor={(page) => `/admin/enquiries${toQuery(raw, { page: page > 1 ? String(page) : null })}`}
      />
    </>
  );
}

async function BoardView({ actor, params }: ViewProps) {
  const columns = await getEnquiryBoard(actor, params);
  return <EnquiryBoard columns={columns} />;
}

function ListSkeleton() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading enquiries">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
