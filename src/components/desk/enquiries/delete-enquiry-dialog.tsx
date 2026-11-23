"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormField, fieldAria } from "@/components/desk/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteEnquiryAction } from "@/server/actions/enquiries";
import { useActionRunner } from "./use-action";

/** Permanent delete for spam, tests and duplicates. Confirmed by typing the reference. */
export function DeleteEnquiryDialog({
  enquiryId,
  reference,
  blockers,
  impact,
}: {
  enquiryId: string;
  reference: string;
  blockers: string[];
  impact: { tasks: number; notes: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const { pending, run } = useActionRunner();
  const matches = confirm.trim().toUpperCase() === reference.toUpperCase();
  const extras = [
    impact.notes ? `${impact.notes} note${impact.notes === 1 ? "" : "s"}` : null,
    impact.tasks ? `${impact.tasks} task${impact.tasks === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setConfirm("");
        setError(undefined);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 aria-hidden="true" /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        {blockers.length ? (
          <>
            <DialogHeader>
              <DialogTitle>{reference} can&apos;t be deleted</DialogTitle>
              <DialogDescription>
                It has {blockers.join(", ")}, which must be kept. Mark it lost or cancelled instead — closed enquiries are hidden from the lists.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                OK
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(undefined);
              const r = await run(() => deleteEnquiryAction({ enquiryId, confirmReference: confirm }), `${reference} deleted`);
              if (r.ok) {
                setOpen(false);
                router.push("/admin/enquiries");
              } else if (r.error.fieldErrors) {
                setError(r.error.fieldErrors.confirmReference?.[0]);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Delete {reference}?</DialogTitle>
              <DialogDescription>
                Use this for spam, test or duplicate enquiries. It permanently removes the enquiry, its timeline
                {extras.length ? ` and ${extras.join(" and ")}` : ""}. It can&apos;t be undone. For real leads that didn&apos;t work out, mark them lost instead.
              </DialogDescription>
            </DialogHeader>
            <FormField id="delete-enquiry-confirm" label={`Type ${reference} to confirm`} error={error}>
              <Input id="delete-enquiry-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" {...fieldAria("delete-enquiry-confirm", error)} />
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
        )}
      </DialogContent>
    </Dialog>
  );
}
