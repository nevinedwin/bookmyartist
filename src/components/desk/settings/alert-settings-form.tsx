"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { type FieldErrors, FormField, fieldAria } from "@/components/desk/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendTestAlertAction, updateAlertSettingsAction } from "@/server/actions/settings";
import { useActionRunner } from "../enquiries/use-action";

export function AlertSettingsForm({ emails, whatsapp }: { emails: string[]; whatsapp: string[] }) {
  const [v, setV] = useState({ emails: emails.join("\n"), whatsapp: whatsapp.join("\n") });
  const [errors, setErrors] = useState<FieldErrors>({});
  const save = useActionRunner();
  const test = useActionRunner();
  const err = (prefix: string) => Object.entries(errors).find(([k]) => k === prefix || k.startsWith(`${prefix}.`))?.[1]?.[0];

  return (
    <form
      className="grid gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setErrors({});
        const r = await save.run(() => updateAlertSettingsAction(v), "Alert recipients saved");
        if (!r.ok && r.error.fieldErrors) setErrors(r.error.fieldErrors);
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <FormField id="alert-emails" label="Email alerts go to" error={err("emails")} hint="One address per line. Up to 10.">
          <Textarea id="alert-emails" rows={4} value={v.emails} onChange={(e) => setV((p) => ({ ...p, emails: e.target.value }))} {...fieldAria("alert-emails", err("emails"), true)} />
        </FormField>
        <FormField
          id="alert-whatsapp"
          label="WhatsApp alerts go to"
          error={err("whatsapp")}
          hint="One number per line, e.g. 98765 43210 or +971 50 123 4567. Up to 10."
        >
          <Textarea id="alert-whatsapp" rows={4} value={v.whatsapp} onChange={(e) => setV((p) => ({ ...p, whatsapp: e.target.value }))} {...fieldAria("alert-whatsapp", err("whatsapp"), true)} />
        </FormField>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={save.pending}>
          {save.pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Save recipients
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={test.pending}
          onClick={() =>
            test.run(sendTestAlertAction, (d) =>
              d.recipients === 0
                ? "No saved recipients — save some first"
                : `Test sent · email: ${d.email.sent} sent, ${d.email.skipped} skipped, ${d.email.failed} failed · WhatsApp: ${d.whatsapp.sent} sent, ${d.whatsapp.skipped} skipped, ${d.whatsapp.failed} failed`,
            )
          }
        >
          {test.pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
          Send test alert
        </Button>
      </div>
    </form>
  );
}
