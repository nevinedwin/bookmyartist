"use client";

import { BadgeCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { NativeSelect } from "@/components/desk/native-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ArtistStatus } from "@/generated/prisma/enums";
import { ARTIST_STATUS_LABELS } from "@/lib/labels";
import { markArtistAvailabilityVerifiedAction, setArtistStatusAction } from "@/server/actions/artists";
import { useActionRunner } from "../enquiries/use-action";

const HINTS: Record<ArtistStatus, string> = {
  ACTIVE: "Visible on the website and bookable.",
  INACTIVE: "Hidden from the website. Use while a profile is being prepared.",
  ON_HOLD: "Hidden from the website for now (e.g. on tour or on a break).",
  ARCHIVED: "No longer represented. Hidden everywhere and removed from featured.",
};

export function ArtistStatusControl({ artistId, status }: { artistId: string; status: ArtistStatus }) {
  const [to, setTo] = useState<ArtistStatus>(status);
  const { pending, run } = useActionRunner();
  return (
    <form
      className="grid gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await run(
          () => setArtistStatusAction({ artistId, from: status, to }),
          to === "ACTIVE" ? "Published on the website" : status === "ACTIVE" ? "Removed from the website" : "Status updated",
        );
      }}
    >
      <Label htmlFor="artist-status">Status</Label>
      <NativeSelect id="artist-status" value={to} onChange={(e) => setTo(e.target.value as ArtistStatus)}>
        {(Object.keys(ARTIST_STATUS_LABELS) as ArtistStatus[]).map((s) => (
          <option key={s} value={s}>
            {s === "ACTIVE" ? "On website" : ARTIST_STATUS_LABELS[s]}
          </option>
        ))}
      </NativeSelect>
      <p className="text-xs text-muted-foreground">{HINTS[to]}</p>
      <div>
        <Button type="submit" size="sm" variant={to === "ACTIVE" ? "default" : "outline"} disabled={pending || to === status}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {to === "ACTIVE" ? "Publish" : status === "ACTIVE" ? "Unpublish" : "Update status"}
        </Button>
      </div>
    </form>
  );
}

export function VerifyAvailabilityButton({ artistId }: { artistId: string }) {
  const { pending, run } = useActionRunner();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => run(() => markArtistAvailabilityVerifiedAction({ artistId }), "Availability marked as checked")}
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <BadgeCheck aria-hidden="true" />}
      I&apos;ve checked their calendar
    </Button>
  );
}
