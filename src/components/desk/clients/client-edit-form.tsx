"use client";

import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { useState } from "react";
import type { FieldErrors } from "@/components/desk/form-field";
import { Button } from "@/components/ui/button";
import { setClientArchivedAction, updateClientAction } from "@/server/actions/clients";
import { useActionRunner } from "../enquiries/use-action";
import { ClientFields, type ClientValues } from "./client-fields";

export function ClientEditForm({ clientId, updatedAt, initial, canEdit }: { clientId: string; updatedAt: string; initial: ClientValues; canEdit: boolean }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { pending, run } = useActionRunner();
  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setErrors({});
        const r = await run(() => updateClientAction({ ...values, clientId, expectedUpdatedAt: updatedAt }), "Client saved");
        if (!r.ok && r.error.fieldErrors) setErrors(r.error.fieldErrors);
      }}
    >
      <ClientFields values={values} onChange={setValues} errors={errors} disabled={!canEdit} />
      {canEdit ? (
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Save client
          </Button>
        </div>
      ) : null}
    </form>
  );
}

export function ArchiveClientButton({ clientId, archived }: { clientId: string; archived: boolean }) {
  const { pending, run } = useActionRunner();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => run(() => setClientArchivedAction({ clientId, archived: !archived }), archived ? "Client restored" : "Client archived")}
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : archived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
      {archived ? "Restore" : "Archive"}
    </Button>
  );
}
