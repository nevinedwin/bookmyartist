"use client";

import { Loader2, Plus, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FieldErrors } from "@/components/desk/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createClientAction } from "@/server/actions/clients";
import type { ClientMatch } from "@/server/services/admin/clients";
import { useActionRunner } from "../enquiries/use-action";
import { ClientFields, type ClientValues, EMPTY_CLIENT } from "./client-fields";
import { DuplicateList } from "./duplicate-list";

export function CreateClientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ClientValues>(EMPTY_CLIENT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [duplicates, setDuplicates] = useState<ClientMatch[] | null>(null);
  const { pending, run } = useActionRunner();

  async function save(allowDuplicate: boolean) {
    setErrors({});
    const r = await run(() => createClientAction({ ...values, allowDuplicate }));
    if (!r.ok) {
      if (r.error.fieldErrors) setErrors(r.error.fieldErrors);
      return;
    }
    if (!r.data.created) {
      setDuplicates(r.data.duplicates);
      return;
    }
    setOpen(false);
    router.push(`/admin/clients/${r.data.id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setValues(EMPTY_CLIENT);
          setErrors({});
          setDuplicates(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden="true" /> New client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>New client</DialogTitle>
            <DialogDescription>Address, GSTIN and notes can be added on the client page.</DialogDescription>
          </DialogHeader>
          <ClientFields
            values={values}
            onChange={(next) => {
              setValues(next);
              setDuplicates(null);
            }}
            errors={errors}
            compact
          />
          {duplicates ? (
            <div className="grid gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950" role="alert">
              <p className="flex items-center gap-2 text-sm font-medium">
                <TriangleAlert className="size-4" aria-hidden="true" /> This may already be a client
              </p>
              <DuplicateList matches={duplicates} linkTarget="_blank" />
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {duplicates ? (
              <Button type="button" variant="secondary" disabled={pending} onClick={() => void save(true)}>
                {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                Create anyway
              </Button>
            ) : (
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                Create client
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
