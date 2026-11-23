import { ArrowLeft, ExternalLink, MicVocal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { ArtistInternalForm } from "@/components/desk/artists/artist-internal-form";
import { ArtistProfileForm } from "@/components/desk/artists/artist-profile-form";
import { ArtistStatusControl, VerifyAvailabilityButton } from "@/components/desk/artists/artist-status-controls";
import { DeleteArtistDialog } from "@/components/desk/artists/delete-artist-dialog";
import { ArtistStatusBadge, EnquiryStatusBadge } from "@/components/desk/badges";
import { EmptyState } from "@/components/desk/empty-state";
import { NoAccess } from "@/components/desk/no-access";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { formatINR } from "@/lib/money";
import { formatCalendarDate, formatDate, formatDateTime } from "@/lib/time";
import { actorWith } from "@/server/auth/dal";
import { getArtistForAdmin, listArtistCategories } from "@/server/services/admin/artists";

export const metadata: Metadata = { title: "Artist" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ArtistPage({ params }: PageProps<"/admin/artists/[id]">) {
  return (
    <div className="grid gap-6">
      <Link href="/admin/artists" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Artists
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <ArtistDetailView params={params} />
      </Suspense>
    </div>
  );
}

async function ArtistDetailView({ params }: { params: PageProps<"/admin/artists/[id]">["params"] }) {
  const actor = await actorWith("artist:read");
  if (!actor) return <NoAccess what="artists" />;
  const { id } = await params;
  const artist = UUID.test(id) ? await getArtistForAdmin(actor, id) : null;
  if (!artist) {
    return (
      <EmptyState icon={MicVocal} title="Artist not found">
        The link may be wrong. <Link href="/admin/artists" className="text-primary underline">Back to artists</Link>
      </EmptyState>
    );
  }
  const categories = artist.permissions.write ? await listArtistCategories(actor) : [];
  const p = artist.profile;
  // Remount editors after any save so they start from the saved version.
  const version = artist.updatedAt.toISOString();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid min-w-0 content-start gap-6">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{p.stageName}</h1>
          <ArtistStatusBadge status={artist.status} />
          {artist.status === "ACTIVE" ? (
            <Button asChild variant="ghost" size="sm">
              <a href={`/artists/${p.slug}`} target="_blank" rel="noreferrer">
                View on website <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          ) : null}
        </header>

        {artist.permissions.write ? (
          <ArtistProfileForm key={version} mode="edit" artistId={artist.id} updatedAt={version} initial={p} categories={categories} />
        ) : (
          <ReadOnlyProfile artist={artist} />
        )}

        {artist.internal ? (
          <Section title="Private details" id="private">
            <ArtistInternalForm key={artist.internal.updatedAt?.toISOString() ?? "new"} artistId={artist.id} initial={artist.internal} canEdit={artist.permissions.write} />
          </Section>
        ) : null}
      </div>

      <aside className="grid content-start gap-4 lg:sticky lg:top-20 lg:self-start">
        {artist.permissions.write ? (
          <div className="rounded-xl border bg-card p-5">
            <ArtistStatusControl key={artist.status} artistId={artist.id} status={artist.status} />
          </div>
        ) : null}
        <div className="grid gap-3 rounded-xl border bg-card p-5">
          <h2 className="font-medium">Availability</h2>
          <p className="text-sm text-muted-foreground">
            {artist.availabilityFresh && artist.availabilityVerifiedAt
              ? `Checked ${formatDate(artist.availabilityVerifiedAt)}. The website shows an “Available” badge until 30 days after that.`
              : artist.availabilityVerifiedAt
                ? `Last checked ${formatDate(artist.availabilityVerifiedAt)} — too long ago, so no badge is shown.`
                : "Never checked, so no “Available” badge is shown."}
          </p>
          {artist.permissions.write ? (
            <div>
              <VerifyAvailabilityButton artistId={artist.id} />
            </div>
          ) : null}
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-medium">Recent enquiries</h2>
          {artist.recentEnquiries.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No enquiries mention this artist yet.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {artist.recentEnquiries.map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/enquiries/${e.id}`} className="flex items-center justify-between gap-2 rounded-md text-sm hover:underline">
                    <span className="min-w-0 truncate">
                      {e.contactName}
                      <span className="block text-xs text-muted-foreground">
                        {e.reference} · {formatCalendarDate(e.eventDate)}
                      </span>
                    </span>
                    <EnquiryStatusBadge status={e.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {artist.permissions.delete ? (
          <div className="grid gap-3 rounded-xl border border-destructive/30 bg-card p-5">
            <h2 className="font-medium">Delete</h2>
            {artist.deleteBlockers.length ? (
              <p className="text-sm text-muted-foreground">
                Can&apos;t be deleted: linked to {artist.deleteBlockers.join(", ")}. Set the status to <strong>Archived</strong> instead — that hides
                them everywhere and keeps the history intact.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">No enquiries, bookings or payments reference this artist, so they can be removed permanently.</p>
                <div>
                  <DeleteArtistDialog artistId={artist.id} stageName={p.stageName} />
                </div>
              </>
            )}
          </div>
        ) : null}
        <p className="px-1 text-xs text-muted-foreground">
          Added {formatDate(artist.createdAt)} · Updated {formatDateTime(artist.updatedAt)}
        </p>
      </aside>
    </div>
  );
}

function ReadOnlyProfile({ artist }: { artist: NonNullable<Awaited<ReturnType<typeof getArtistForAdmin>>> }) {
  const p = artist.profile;
  return (
    <Section title="Profile">
      <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
        {(
          [
            ["Web address", `/artists/${p.slug}`],
            ["Base city", p.baseCity],
            ["Tagline", p.tagline],
            ["Performance", p.performanceTypes.join(", ")],
            ["Languages", p.languages.join(", ")],
            ["Events", p.eventTypes.map((t) => EVENT_TYPE_LABELS[t]).join(", ")],
            ["Public price", p.publicPriceVisible && p.publicPriceFromPaise ? `From ${formatINR(p.publicPriceFromPaise)}` : "Not shown"],
          ] as [string, string][]
        )
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      <p className="mt-4 text-sm whitespace-pre-wrap">{p.biography}</p>
    </Section>
  );
}

function Section({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-xl border bg-card p-5" aria-label={title}>
      <h2 className="font-medium">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" aria-busy="true" aria-label="Loading artist">
      <div className="grid gap-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
