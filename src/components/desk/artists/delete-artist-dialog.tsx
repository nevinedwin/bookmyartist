"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormField, fieldAria } from "@/components/desk/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteArtistAction } from "@/server/actions/artists";
import { useActionRunner } from "../enquiries/use-action";

/** Permanent delete, only offered for artists without history. Confirmed by typing the stage name. */
export function DeleteArtistDialog({ artistId, stageName }: { artistId: string; stageName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string>();
  const { pending, run } = useActionRunner();
  const matches = confirmName.trim().toLowerCase() === stageName.trim().toLowerCase();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setConfirmName("");
        setError(undefined);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 aria-hidden="true" /> Delete artist
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(undefined);
            const r = await run(() => deleteArtistAction({ artistId, confirmName }), `${stageName} deleted`);
            if (r.ok) {
              setOpen(false);
              router.push("/admin/artists");
            } else if (r.error.fieldErrors) {
              setError(r.error.fieldErrors.confirmName?.[0]);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete {stageName}?</DialogTitle>
            <DialogDescription>
              This permanently removes the profile, images, availability and private details, and takes the page off the website. It can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <FormField id="delete-confirm" label={`Type “${stageName}” to confirm`} error={error}>
            <Input id="delete-confirm" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" {...fieldAria("delete-confirm", error)} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending || !matches}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Delete permanently
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
