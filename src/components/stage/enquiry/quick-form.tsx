"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { EventType } from "@/generated/prisma/enums";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { COUNTRY_CODES, publicEnquirySchema } from "@/lib/validation/enquiry";
import { Field, Honeypot, SelectInput, TextArea, TextInput } from "./fields";
import { submitEnquiry } from "./submit";
import { EnquirySuccess } from "./success";
import { Turnstile } from "./turnstile";

/** Single-step enquiry used on the contact page (source: CONTACT_PAGE). */
export function QuickEnquiryForm({ formToken, today, turnstileSiteKey }: { formToken: string; today: string; turnstileSiteKey?: string }) {
  const [v, setV] = useState({
    name: "",
    email: "",
    phoneCountryCode: "+91",
    phone: "",
    eventType: "",
    eventDate: "",
    eventCity: "",
    message: "",
    consent: false,
    website: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | undefined>();

  const set = (key: keyof typeof v, value: string | boolean) => {
    setV((s) => ({ ...s, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  if (reference) return <EnquirySuccess reference={reference} name={v.name} email={v.email} />;

  return (
    <form
      noValidate
      className="relative grid gap-6 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const payload = { ...v, source: "CONTACT_PAGE", sourcePath: "/contact", formToken, turnstileToken: captcha };
        const parsed = publicEnquirySchema(today).safeParse(payload);
        if (!parsed.success) {
          const found: Record<string, string> = {};
          for (const issue of parsed.error.issues) {
            const k = String(issue.path[0]);
            found[k] ??= issue.message;
          }
          setErrors(found);
          const firstKey = Object.keys(found)[0];
          document.querySelector<HTMLElement>(`[name="${firstKey}"]`)?.focus();
          return;
        }
        if (turnstileSiteKey && !captcha) {
          setFormError("Please complete the verification.");
          return;
        }
        setSubmitting(true);
        setFormError(null);
        const outcome = await submitEnquiry(payload);
        setSubmitting(false);
        if (outcome.status === "success") setReference(outcome.reference);
        else {
          if (outcome.status === "invalid") setErrors(outcome.fieldErrors);
          setFormError(outcome.message);
        }
      }}
    >
      <Honeypot value={v.website} onChange={(x) => set("website", x)} />
      <Field label="Your name" error={errors.name}>
        {(p) => <TextInput {...p} name="name" autoComplete="name" value={v.name} onChange={(e) => set("name", e.target.value)} />}
      </Field>
      <Field label="Email" error={errors.email}>
        {(p) => <TextInput {...p} name="email" type="email" autoComplete="email" value={v.email} onChange={(e) => set("email", e.target.value)} />}
      </Field>
      <Field label="Phone number" error={errors.phone}>
        {(p) => (
          <div className="flex gap-2">
            <SelectInput name="phoneCountryCode" aria-label="Country code" className="w-28 shrink-0" value={v.phoneCountryCode} onChange={(e) => set("phoneCountryCode", e.target.value)}>
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </SelectInput>
            <TextInput {...p} name="phone" type="tel" autoComplete="tel-national" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
        )}
      </Field>
      <Field label="Type of event" error={errors.eventType}>
        {(p) => (
          <SelectInput {...p} name="eventType" value={v.eventType} onChange={(e) => set("eventType", e.target.value)}>
            <option value="">Select…</option>
            {(Object.keys(EventType) as EventType[]).map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <Field label="Event date" error={errors.eventDate}>
        {(p) => <TextInput {...p} name="eventDate" type="date" min={today} value={v.eventDate} onChange={(e) => set("eventDate", e.target.value)} />}
      </Field>
      <Field label="City" error={errors.eventCity}>
        {(p) => <TextInput {...p} name="eventCity" value={v.eventCity} onChange={(e) => set("eventCity", e.target.value)} />}
      </Field>
      <Field label="Message" optional className="sm:col-span-2" error={errors.message}>
        {(p) => <TextArea {...p} name="message" placeholder="Tell us what you have in mind" value={v.message} onChange={(e) => set("message", e.target.value)} />}
      </Field>
      <div className="sm:col-span-2">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink/85">
          <input type="checkbox" name="consent" checked={v.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-magenta" />
          I agree to be contacted by phone, WhatsApp or email about this enquiry.
        </label>
        {errors.consent && (
          <p role="alert" className="mt-2 text-sm text-[#ff8fa3]">
            {errors.consent}
          </p>
        )}
      </div>
      {turnstileSiteKey && (
        <div className="sm:col-span-2">
          <Turnstile siteKey={turnstileSiteKey} onToken={setCaptcha} />
        </div>
      )}
      {formError && (
        <p role="alert" className="rounded-2xl border border-[#ff8fa3]/40 bg-[#ff8fa3]/10 px-5 py-4 text-sm text-[#ffc2cd] sm:col-span-2">
          {formError}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="focus-ring inline-flex h-13 items-center gap-2 rounded-full bg-gradient-to-r from-electric to-magenta px-8 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {submitting ? "Sending…" : "Send message"}
          {!submitting && <ArrowRight className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}
