"use client";

import { type FieldErrors, FormField, fieldAria } from "@/components/desk/form-field";
import { NativeSelect } from "@/components/desk/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ClientType } from "@/generated/prisma/enums";
import { CLIENT_TYPE_LABELS } from "@/lib/labels";

export interface ClientValues {
  name: string;
  email: string;
  phone: string;
  organization: string;
  type: ClientType;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  taxId: string;
  notes: string;
}

export const EMPTY_CLIENT: ClientValues = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  type: "INDIVIDUAL",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  taxId: "",
  notes: "",
};

/** The client form body, shared by the create dialog and the edit page. */
export function ClientFields({
  values,
  onChange,
  errors,
  disabled,
  compact,
}: {
  values: ClientValues;
  onChange: (next: ClientValues) => void;
  errors: FieldErrors;
  disabled?: boolean;
  /** Create dialog: contact essentials only. */
  compact?: boolean;
}) {
  const err = (k: string) => errors[k]?.[0];
  const text = (k: keyof ClientValues) => ({
    id: `client-${k}`,
    value: values[k],
    disabled,
    onChange: (e: { target: { value: string } }) => onChange({ ...values, [k]: e.target.value }),
    ...fieldAria(`client-${k}`, err(k)),
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="client-name" label="Name" error={err("name")}>
        <Input {...text("name")} maxLength={160} required autoComplete="off" />
      </FormField>
      <FormField id="client-type" label="Type" error={err("type")}>
        <NativeSelect {...text("type")}>
          {Object.entries(CLIENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="client-email" label="Email" error={err("email")} hint="Email or phone is required.">
        <Input {...text("email")} type="email" autoComplete="off" />
      </FormField>
      <FormField id="client-phone" label="Phone" error={err("phone")} hint="10-digit Indian mobile, or include the country code.">
        <Input {...text("phone")} type="tel" autoComplete="off" />
      </FormField>
      <FormField id="client-organization" label="Organisation" optional error={err("organization")} className="sm:col-span-2">
        <Input {...text("organization")} maxLength={160} />
      </FormField>
      {compact ? null : (
        <>
          <FormField id="client-addressLine1" label="Address" optional error={err("addressLine1")} className="sm:col-span-2">
            <Input {...text("addressLine1")} maxLength={200} placeholder="Street and building" />
          </FormField>
          <FormField id="client-addressLine2" label="Address line 2" optional error={err("addressLine2")} className="sm:col-span-2">
            <Input {...text("addressLine2")} maxLength={200} />
          </FormField>
          <FormField id="client-city" label="City" optional error={err("city")}>
            <Input {...text("city")} maxLength={80} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="client-state" label="State" optional error={err("state")}>
              <Input {...text("state")} maxLength={80} />
            </FormField>
            <FormField id="client-postalCode" label="PIN code" optional error={err("postalCode")}>
              <Input {...text("postalCode")} maxLength={12} inputMode="numeric" />
            </FormField>
          </div>
          <FormField id="client-taxId" label="GSTIN" optional error={err("taxId")} hint="Recorded as given, for invoices.">
            <Input {...text("taxId")} maxLength={20} />
          </FormField>
          <FormField id="client-notes" label="Notes" optional error={err("notes")} className="sm:col-span-2">
            <Textarea {...text("notes")} rows={4} maxLength={10_000} placeholder="Internal only" />
          </FormField>
        </>
      )}
    </div>
  );
}
