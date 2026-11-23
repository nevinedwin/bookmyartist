import { MicVocal, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArtistTable } from "@/components/desk/artists/artist-table";
import { EmptyState } from "@/components/desk/empty-state";
import { ListFilters } from "@/components/desk/list-filters";
import { NoAccess } from "@/components/desk/no-access";
import { PageHeader } from "@/components/desk/page-header";
import { Pagination } from "@/components/desk/pagination";
import { toQuery } from "@/components/desk/query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ARTIST_STATUS_LABELS } from "@/lib/labels";
import { ARTIST_PAGE_SIZE, artistListParamsSchema } from "@/lib/validation/artists";
import { can } from "@/server/auth/actor";
import { actorWith } from "@/server/auth/dal";
import { listArtistCategories, listArtists } from "@/server/services/admin/artists";

export const metadata: Metadata = { title: "Artists" };

export default function ArtistsPage({ searchParams }: PageProps<"/admin/artists">) {
  return (
    <div className="grid gap-5">
      <Suspense fallback={<ListSkeleton />}>
        <Artists searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Artists({ searchParams }: { searchParams: PageProps<"/admin/artists">["searchParams"] }) {
  const actor = await actorWith("artist:read");
  if (!actor) return <NoAccess what="artists" />;
  const raw = await searchParams;
  const params = artistListParamsSchema.parse(raw);
  const [result, categories] = await Promise.all([listArtists(actor, params), listArtistCategories(actor)]);
  const filtered = Boolean(params.q || params.status || params.category || params.featured);

  return (
    <>
      <PageHeader
        title="Artists"
        description="The roster. Only artists marked “On website” appear on the public site."
        actions={
          can(actor, "artist:write") ? (
            <Button asChild>
              <Link href="/admin/artists/new">
                <Plus aria-hidden="true" /> Add artist
              </Link>
            </Button>
          ) : null
        }
      />
      <ListFilters
        searchLabel="Search artists"
        placeholder="Name, city, web address…"
        selects={[
          {
            key: "status",
            label: "Status",
            allLabel: params.archived ? "All statuses" : "All except archived",
            options: Object.entries(ARTIST_STATUS_LABELS).map(([value, label]) => ({ value, label: value === "ACTIVE" ? "On website" : label })),
          },
          { key: "category", label: "Category", allLabel: "All categories", options: categories.map((c) => ({ value: c.id, label: c.name })) },
        ]}
        toggles={[
          { key: "featured", label: "Featured only" },
          { key: "archived", label: "Include archived" },
        ]}
      />
      {result.total === 0 ? (
        <EmptyState icon={MicVocal} title={filtered ? "No artists match these filters" : "No artists yet"}>
          {filtered ? "Try a different search or clear the filters." : "Add your first artist to start building the roster."}
        </EmptyState>
      ) : (
        <>
          <ArtistTable items={result.items} />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            pageSize={ARTIST_PAGE_SIZE}
            hrefFor={(page) => `/admin/artists${toQuery(raw, { page: page > 1 ? String(page) : null })}`}
          />
        </>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading artists">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
