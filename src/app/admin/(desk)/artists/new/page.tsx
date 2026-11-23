import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArtistProfileForm } from "@/components/desk/artists/artist-profile-form";
import { NoAccess } from "@/components/desk/no-access";
import { PageHeader } from "@/components/desk/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { actorWith } from "@/server/auth/dal";
import { listArtistCategories } from "@/server/services/admin/artists";

export const metadata: Metadata = { title: "Add artist" };

export default function NewArtistPage() {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <Link href="/admin/artists" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Artists
      </Link>
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-xl" />}>
        <NewArtist />
      </Suspense>
    </div>
  );
}

async function NewArtist() {
  const actor = await actorWith("artist:write");
  if (!actor) return <NoAccess what="adding artists" />;
  const categories = await listArtistCategories(actor);
  return (
    <>
      <PageHeader title="Add artist" description="Starts hidden from the website unless you publish it now. Private rates and contacts can be added after saving." />
      <ArtistProfileForm mode="create" categories={categories} />
    </>
  );
}
