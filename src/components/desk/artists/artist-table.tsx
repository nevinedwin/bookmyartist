import { BadgeCheck, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ArtistStatusBadge } from "@/components/desk/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/time";
import type { ArtistListItem } from "@/server/services/admin/artists";

export function ArtistTable({ items }: { items: ArtistListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table className="min-w-[760px]">
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[34%]">Artist</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Availability</TableHead>
            <TableHead className="text-right">Open enquiries</TableHead>
            <TableHead className="text-right">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((a) => {
            return (
              <TableRow key={a.id} className="relative">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-muted">
                      {a.profileImageUrl ? <Image src={a.profileImageUrl} alt="" fill sizes="36px" className="object-cover" /> : null}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/artists/${a.id}`}
                        className="font-medium after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:ring-2 after:focus-visible:ring-ring after:focus-visible:ring-inset"
                      >
                        {a.stageName}
                      </Link>
                      {a.isFeatured ? (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-xs text-amber-700">
                          <Star className="size-3 fill-current" aria-hidden="true" /> Featured
                        </span>
                      ) : null}
                      <p className="truncate text-xs text-muted-foreground">
                        {a.baseCity} · /{a.slug}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{a.categoryName}</TableCell>
                <TableCell>
                  <ArtistStatusBadge status={a.status} />
                </TableCell>
                <TableCell className="text-xs">
                  {a.availabilityFresh && a.availabilityVerifiedAt ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <BadgeCheck className="size-3.5" aria-hidden="true" /> Verified {formatDate(a.availabilityVerifiedAt)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{a.availabilityVerifiedAt ? `Stale · ${formatDate(a.availabilityVerifiedAt)}` : "Not verified"}</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">{a.openEnquiries || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{formatDate(a.updatedAt)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
