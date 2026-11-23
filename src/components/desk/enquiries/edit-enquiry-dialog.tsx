"use client";

import { Loader2, Pencil } from "lucide-react";
import { type ReactNode, useState } from "react";
import { type FieldErrors, FormField, fieldAria } from "@/components/desk/form-field";
import { NativeSelect } from "@/components/desk/native-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { EventType } from "@/generated/prisma/enums";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { updateEnquiryDetailsAction } from "@/server/actions/enquiries";
import { useActionRunner } from "./use-action";

export interface EnquiryEditValues {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  organization: string;
  eventType: EventType;
  eventDate: string;
  eventCity: string;
  venue: string;
  audienceSize: string;
  categoryId: string;
  performanceType: string;
  performersCount: string;
  durationMinutes: string;
  additionalRequirements: string;
  /** Rupees as typed. */
  budgetMin: string;
  budgetMax: string;
}

/** Correct an enquiry's details. Every change is summarised on the timeline. */
export function EditEnquiryDialog({
  enquiryId,
  updatedAt,
  initial,
  categories,
}: {
  enquiryId: string;
  updatedAt: string;
  initial: EnquiryEditValues;
  categories: { id: string; name: string; isActive: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { pending, run } = useActionRunner();
  const err = (k: string) => errors[k]?.[0];
  const field = (k: keyof EnquiryEditValues) => ({
    id: `enq-${k}`,
    value: v[k],
    onChange: (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value })),
    ...fieldAria(`enq-${k}`, err(k)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setV(initial);
          setErrors({});
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil aria-hidden="true" /> Edit details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <form
          className="grid gap-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setErrors({});
            const r = await run(
              () => updateEnquiryDetailsAction({ ...v, enquiryId, expectedUpdatedAt: updatedAt, categoryId: v.categoryId || null }),
              (d) => (d.changed.length ? "Enquiry updated" : "Nothing changed"),
            );
            if (r.ok) setOpen(false);
            else if (r.error.fieldErrors) setErrors(r.error.fieldErrors);
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit enquiry</DialogTitle>
            <DialogDescription>Fix mistakes or record changes the customer told you about. The customer&apos;s message stays as they sent it.</DialogDescription>
          </DialogHeader>

          <Group title="Contact">
            <FormField id="enq-contactName" label="Name" error={err("contactName")}>
              <Input {...field("contactName")} maxLength={100} />
            </FormField>
            <FormField id="enq-organization" label="Organisation" optional error={err("organization")}>
              <Input {...field("organization")} maxLength={120} />
            </FormField>
            <FormField id="enq-contactEmail" label="Email" error={err("contactEmail")}>
              <Input {...field("contactEmail")} type="email" />
            </FormField>
            <FormField id="enq-contactPhone" label="Phone" error={err("contactPhone")} hint="Include the country code for non-Indian numbers.">
              <Input {...field("contactPhone")} type="tel" />
            </FormField>
          </Group>

          <Group title="Event">
            <FormField id="enq-eventType" label="Event type" error={err("eventType")}>
              <NativeSelect {...field("eventType")}>
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="enq-eventDate" label="Date" error={err("eventDate")}>
              <Input {...field("eventDate")} type="date" />
            </FormField>
            <FormField id="enq-eventCity" label="City" error={err("eventCity")}>
              <Input {...field("eventCity")} maxLength={80} />
            </FormField>
            <FormField id="enq-venue" label="Venue" optional error={err("venue")}>
              <Input {...field("venue")} maxLength={160} />
            </FormField>
            <FormField id="enq-audienceSize" label="Audience" optional error={err("audienceSize")}>
              <Input {...field("audienceSize")} inputMode="numeric" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="enq-budgetMin" label="Budget from (₹)" optional error={err("budgetMin")}>
                <Input {...field("budgetMin")} inputMode="decimal" />
              </FormField>
              <FormField id="enq-budgetMax" label="Budget up to (₹)" optional error={err("budgetMax")}>
                <Input {...field("budgetMax")} inputMode="decimal" />
              </FormField>
            </div>
          </Group>

          <Group title="Entertainment">
            <FormField id="enq-categoryId" label="Category" optional error={err("categoryId")}>
              <NativeSelect {...field("categoryId")}>
                <option value="">Not specified</option>
                {categories
                  .filter((c) => c.isActive || c.id === v.categoryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </NativeSelect>
            </FormField>
            <FormField id="enq-performanceType" label="Performance" optional error={err("performanceType")}>
              <Input {...field("performanceType")} maxLength={120} />
            </FormField>
            <FormField id="enq-performersCount" label="Performers" optional error={err("performersCount")}>
              <Input {...field("performersCount")} inputMode="numeric" />
            </FormField>
            <FormField id="enq-durationMinutes" label="Duration (min)" optional error={err("durationMinutes")}>
              <Input {...field("durationMinutes")} inputMode="numeric" />
            </FormField>
            <FormField id="enq-additionalRequirements" label="Requirements" optional error={err("additionalRequirements")} className="sm:col-span-2">
              <Textarea {...field("additionalRequirements")} rows={3} maxLength={2000} />
            </FormField>
          </Group>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="mb-3 text-xs font-medium text-muted-foreground uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}
