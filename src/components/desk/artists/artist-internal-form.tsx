"use client";

import { Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { type FieldErrors, FormField, fieldAria } from "@/components/desk/form-field";
import { NativeSelect } from "@/components/desk/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CommissionType } from "@/generated/prisma/enums";
import { COMMISSION_TYPE_LABELS } from "@/lib/labels";
import { paiseToRupeeInput } from "@/lib/money";
import { updateArtistInternalAction } from "@/server/actions/artists";
import type { ArtistInternalValues } from "@/server/services/admin/artists";
import { useActionRunner } from "../enquiries/use-action";

const bpsToPercent = (bps: number | null) => (bps === null ? "" : String(bps / 100));

/** Confidential artist data (`artist:internal`). Never shown on the website; changes are audited. */
export function ArtistInternalForm({ artistId, initial, canEdit }: { artistId: string; initial: ArtistInternalValues; canEdit: boolean }) {
  const [v, setV] = useState({
    legalName: initial.legalName,
    contactEmail: initial.contactEmail,
    contactPhone: initial.contactPhone,
    managerName: initial.managerName,
    managerPhone: initial.managerPhone,
    basePrice: paiseToRupeeInput(initial.basePricePaise),
    commissionType: initial.commissionType,
    commissionRate: bpsToPercent(initial.commissionRateBps),
    commissionFixed: paiseToRupeeInput(initial.commissionFixedPaise),
    bankDetailsNote: initial.bankDetailsNote,
    internalNotes: initial.internalNotes,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const { pending, run } = useActionRunner();
  type Key = keyof typeof v;
  const err = (k: string) => errors[k]?.[0];
  const text = (k: Key) => ({
    id: `internal-${k}`,
    value: v[k],
    disabled: !canEdit,
    onChange: (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value })),
    ...fieldAria(`internal-${k}`, err(k)),
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setErrors({});
        const r = await run(() => updateArtistInternalAction({ artistId, ...v }), "Private details saved");
        if (!r.ok && r.error.fieldErrors) setErrors(r.error.fieldErrors);
      }}
    >
      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3.5" aria-hidden="true" /> Visible only to roles with confidential artist access. Rate changes are recorded in the audit log.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="internal-legalName" label="Legal name" optional error={err("legalName")}>
          <Input {...text("legalName")} maxLength={160} />
        </FormField>
        <FormField id="internal-contactEmail" label="Direct email" optional error={err("contactEmail")}>
          <Input {...text("contactEmail")} type="email" />
        </FormField>
        <FormField id="internal-contactPhone" label="Direct phone" optional error={err("contactPhone")}>
          <Input {...text("contactPhone")} type="tel" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="internal-managerName" label="Manager" optional error={err("managerName")}>
            <Input {...text("managerName")} maxLength={120} />
          </FormField>
          <FormField id="internal-managerPhone" label="Manager phone" optional error={err("managerPhone")}>
            <Input {...text("managerPhone")} type="tel" />
          </FormField>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="internal-basePrice" label="Base fee (₹)" optional error={err("basePrice")} hint="What the artist usually charges">
          <Input {...text("basePrice")} inputMode="decimal" />
        </FormField>
        <FormField id="internal-commissionType" label="Agency commission" error={err("commissionType")}>
          <NativeSelect {...text("commissionType")} onChange={(e) => setV((p) => ({ ...p, commissionType: e.target.value as CommissionType }))}>
            {Object.entries(COMMISSION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        {v.commissionType === "PERCENTAGE" ? (
          <FormField id="internal-commissionRate" label="Commission (%)" error={err("commissionRate")}>
            <Input {...text("commissionRate")} inputMode="decimal" placeholder="20" />
          </FormField>
        ) : (
          <FormField id="internal-commissionFixed" label="Commission (₹)" error={err("commissionFixed")}>
            <Input {...text("commissionFixed")} inputMode="decimal" />
          </FormField>
        )}
      </div>
      <FormField id="internal-bankDetailsNote" label="Payout reference" optional error={err("bankDetailsNote")} hint="A reference only (e.g. “HDFC ••4321, verified Oct 2026”). Never store full account or card numbers.">
        <Input {...text("bankDetailsNote")} maxLength={500} />
      </FormField>
      <FormField id="internal-internalNotes" label="Internal notes" optional error={err("internalNotes")}>
        <Textarea {...text("internalNotes")} rows={4} maxLength={10_000} />
      </FormField>
      {canEdit ? (
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Save private details
          </Button>
        </div>
      ) : null}
    </form>
  );
}
