"use client";

import { ArrowLeft, ArrowRight, Check, Loader2, Pencil } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EventType } from "@/generated/prisma/enums";
import { AUDIENCE_SIZES, BUDGET_RANGES, EVENT_TYPE_LABELS } from "@/lib/labels";
import { COUNTRY_CODES, ENQUIRY_STEP_FIELDS, publicEnquirySchema, type PublicEnquiryInput } from "@/lib/validation/enquiry";
import { formatCalendarDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ChoiceTiles, Field, Honeypot, SelectInput, TextArea, TextInput } from "./fields";
import { submitEnquiry } from "./submit";
import { EnquirySuccess } from "./success";
import { Turnstile } from "./turnstile";

export interface WizardOption {
  slug: string;
  name: string;
}

export interface WizardArtistOption {
  slug: string;
  stageName: string;
  categorySlug: string;
}

export interface WizardInitial {
  artistSlug?: string;
  categorySlug?: string;
  eventType?: EventType;
  serviceSlug?: string;
  experienceName?: string;
  source: "BOOKING_FORM" | "ARTIST_PROFILE" | "SERVICE_PAGE" | "CONTACT_PAGE";
  sourcePath: string;
}

type Values = {
  eventType: string;
  eventDate: string;
  eventCity: string;
  venue: string;
  audienceSize: string;
  categorySlug: string;
  artistSlug: string;
  performanceType: string;
  performersCount: string;
  durationMinutes: string;
  additionalRequirements: string;
  budget: string;
  name: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  organization: string;
  message: string;
  consent: boolean;
  website: string;
};

const STEPS = [
  { key: "event", title: "Event", description: "Tell us about the occasion" },
  { key: "requirements", title: "Entertainment", description: "What would you like on stage?" },
  { key: "contact", title: "Budget & contact", description: "How we can reach you" },
  { key: "review", title: "Review", description: "Check and send" },
] as const;

const DRAFT_KEY = "bma:enquiry-draft:v1";
const EVENT_OPTIONS = (Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((v) => ({ value: v, label: EVENT_TYPE_LABELS[v] }));
const DURATIONS = [30, 45, 60, 90, 120, 180, 240, 300];

function emptyValues(initial: WizardInitial, artists: WizardArtistOption[]): Values {
  const artist = artists.find((a) => a.slug === initial.artistSlug);
  return {
    eventType: initial.eventType ?? "",
    eventDate: "",
    eventCity: "",
    venue: "",
    audienceSize: "",
    categorySlug: artist?.categorySlug ?? initial.categorySlug ?? "",
    artistSlug: artist?.slug ?? "",
    performanceType: initial.experienceName ?? "",
    performersCount: "",
    durationMinutes: "",
    additionalRequirements: "",
    budget: "",
    name: "",
    email: "",
    phoneCountryCode: "+91",
    phone: "",
    organization: "",
    message: "",
    consent: false,
    website: "",
  };
}

export function EnquiryWizard({
  categories,
  artists,
  initial,
  formToken,
  today,
  turnstileSiteKey,
}: {
  categories: WizardOption[];
  artists: WizardArtistOption[];
  initial: WizardInitial;
  formToken: string;
  today: string;
  turnstileSiteKey?: string;
}) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [values, setValues] = useState<Values>(() => emptyValues(initial, artists));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | undefined>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const restored = useRef(false);

  // Restore a draft (contact details & event) from this browser session, but never
  // override a pre-selected artist/category coming from the page the visitor came from.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<Values>;
      // Restoring from browser storage can only happen after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues((v) => ({
        ...v,
        ...draft,
        artistSlug: initial.artistSlug ? v.artistSlug : (draft.artistSlug ?? v.artistSlug),
        categorySlug: initial.artistSlug || initial.categorySlug ? v.categorySlug : (draft.categorySlug ?? v.categorySlug),
        eventType: initial.eventType ? v.eventType : (draft.eventType ?? v.eventType),
        eventDate: draft.eventDate && draft.eventDate >= today ? draft.eventDate : "",
        consent: false,
        website: "",
      }));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [initial.artistSlug, initial.categorySlug, initial.eventType, today]);

  useEffect(() => {
    if (reference) return;
    try {
      const draft: Partial<Values> = { ...values };
      delete draft.consent;
      delete draft.website;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [values, reference]);

  const set = useCallback(<K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const rest = { ...e };
      delete rest[key];
      return rest;
    });
  }, []);

  const filteredArtists = useMemo(
    () => (values.categorySlug ? artists.filter((a) => a.categorySlug === values.categorySlug) : artists),
    [artists, values.categorySlug],
  );

  const payload = useMemo<PublicEnquiryInput>(
    () => ({
      ...values,
      source: initial.source,
      sourcePath: initial.sourcePath,
      serviceSlug: initial.serviceSlug,
      formToken,
      turnstileToken: captcha,
      eventType: values.eventType as EventType,
      consent: values.consent as true,
    }),
    [values, initial, formToken, captcha],
  );

  /** Validate the full payload but only report issues for the given fields. */
  const validate = (fields: readonly string[]): Record<string, string> => {
    const result = publicEnquirySchema(today).safeParse(payload);
    if (result.success) return {};
    const found: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (fields.includes(key) && !found[key]) found[key] = issue.message;
    }
    return found;
  };

  const stepFields = (i: number): readonly string[] =>
    i === 0 ? [...ENQUIRY_STEP_FIELDS.event] : i === 1 ? [...ENQUIRY_STEP_FIELDS.requirements] : i === 2 ? [...ENQUIRY_STEP_FIELDS.contact] : [];

  const focusHeading = () => window.setTimeout(() => headingRef.current?.focus(), 50);

  const goTo = (target: number) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
    setFormError(null);
    focusHeading();
  };

  const next = () => {
    const found = validate(stepFields(step));
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstKey = Object.keys(found)[0];
      window.setTimeout(() => document.querySelector<HTMLElement>(`[name="${firstKey}"]`)?.focus(), 30);
      return;
    }
    goTo(step + 1);
  };

  const submit = async () => {
    const all = validate([...ENQUIRY_STEP_FIELDS.event, ...ENQUIRY_STEP_FIELDS.requirements, ...ENQUIRY_STEP_FIELDS.contact]);
    if (Object.keys(all).length > 0) {
      setErrors(all);
      const firstStep = [0, 1, 2].find((i) => stepFields(i).some((f) => all[f])) ?? 0;
      goTo(firstStep);
      return;
    }
    if (turnstileSiteKey && !captcha) {
      setFormError("Please complete the verification below.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const outcome = await submitEnquiry(payload as unknown as Record<string, unknown>);
    setSubmitting(false);
    if (outcome.status === "success") {
      setReference(outcome.reference);
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      return;
    }
    if (outcome.status === "invalid") {
      setErrors(outcome.fieldErrors);
      const firstStep = [0, 1, 2].find((i) => stepFields(i).some((f) => outcome.fieldErrors[f])) ?? 2;
      goTo(firstStep);
    }
    setFormError(outcome.message);
  };

  if (reference) {
    return <EnquirySuccess reference={reference} name={values.name} email={values.email} />;
  }

  const artistName = artists.find((a) => a.slug === values.artistSlug)?.stageName;
  const categoryName = categories.find((c) => c.slug === values.categorySlug)?.name;
  const budgetLabel = BUDGET_RANGES.find((b) => b.id === values.budget)?.label;
  const audienceLabel = AUDIENCE_SIZES.find((a) => String(a.value) === values.audienceSize)?.label;

  return (
    <div className="relative">
      {/* Progress */}
      <ol className="grid grid-cols-4 gap-2" aria-label="Enquiry progress">
        {STEPS.map((s, i) => (
          <li key={s.key} aria-current={i === step ? "step" : undefined}>
            <button
              type="button"
              disabled={i > step}
              onClick={() => i < step && goTo(i)}
              className="focus-ring group w-full rounded-lg text-left disabled:cursor-default"
            >
              <span className="block h-1 overflow-hidden rounded-full bg-white/10">
                <motion.span
                  className="block h-full bg-gradient-to-r from-electric to-magenta"
                  initial={false}
                  animate={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
                  transition={{ duration: reduce ? 0 : 0.5 }}
                />
              </span>
              <span className={cn("mt-3 flex items-center gap-1.5 text-xs font-medium", i <= step ? "text-ink" : "text-haze")}>
                {i < step && <Check className="size-3.5 text-magenta" aria-hidden="true" />}
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{i + 1}</span>
                <span className="sr-only">{i < step ? " (completed)" : i === step ? " (current)" : ""}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 3) next();
          else void submit();
        }}
        className="relative mt-10"
      >
        <Honeypot value={values.website} onChange={(v) => set("website", v)} />

        <div className="mb-8">
          <p className="text-xs tracking-[0.28em] text-violet-glow uppercase">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 ref={headingRef} tabIndex={-1} className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink outline-none sm:text-4xl">
            {STEPS[step]?.description}
          </h2>
        </div>

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={reduce ? false : { opacity: 0, x: 40 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -40 * direction }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-7"
          >
            {step === 0 && (
              <>
                <ChoiceTiles
                  name="eventType"
                  legend="Type of event"
                  options={EVENT_OPTIONS}
                  value={values.eventType}
                  onChange={(v) => set("eventType", v)}
                  error={errors.eventType}
                />
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Event date" error={errors.eventDate}>
                    {(p) => (
                      <TextInput {...p} name="eventDate" type="date" min={today} value={values.eventDate} onChange={(e) => set("eventDate", e.target.value)} required />
                    )}
                  </Field>
                  <Field label="City / location" error={errors.eventCity}>
                    {(p) => (
                      <TextInput {...p} name="eventCity" autoComplete="address-level2" placeholder="e.g. Udaipur" value={values.eventCity} onChange={(e) => set("eventCity", e.target.value)} required />
                    )}
                  </Field>
                  <Field label="Venue" optional hint="If you've booked one already" error={errors.venue}>
                    {(p) => <TextInput {...p} name="venue" placeholder="Venue name" value={values.venue} onChange={(e) => set("venue", e.target.value)} />}
                  </Field>
                  <Field label="Expected audience" optional error={errors.audienceSize}>
                    {(p) => (
                      <SelectInput {...p} name="audienceSize" value={values.audienceSize} onChange={(e) => set("audienceSize", e.target.value)}>
                        <option value="">Select a range</option>
                        {AUDIENCE_SIZES.map((a) => (
                          <option key={a.id} value={a.value}>
                            {a.label} guests
                          </option>
                        ))}
                      </SelectInput>
                    )}
                  </Field>
                </div>
              </>
            )}

            {step === 1 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Artist category" optional error={errors.categorySlug}>
                  {(p) => (
                    <SelectInput
                      {...p}
                      name="categorySlug"
                      value={values.categorySlug}
                      onChange={(e) => {
                        const slug = e.target.value;
                        set("categorySlug", slug);
                        const current = artists.find((a) => a.slug === values.artistSlug);
                        if (slug && current && current.categorySlug !== slug) set("artistSlug", "");
                      }}
                    >
                      <option value="">Not sure yet — suggest options</option>
                      {categories.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </SelectInput>
                  )}
                </Field>
                <Field label="Preferred artist" optional error={errors.artistSlug}>
                  {(p) => (
                    <SelectInput
                      {...p}
                      name="artistSlug"
                      value={values.artistSlug}
                      onChange={(e) => {
                        const slug = e.target.value;
                        set("artistSlug", slug);
                        const a = artists.find((x) => x.slug === slug);
                        if (a) set("categorySlug", a.categorySlug);
                      }}
                    >
                      <option value="">No preference</option>
                      {filteredArtists.map((a) => (
                        <option key={a.slug} value={a.slug}>
                          {a.stageName}
                        </option>
                      ))}
                    </SelectInput>
                  )}
                </Field>
                <Field label="Performance type" optional hint="e.g. Sufi night, acoustic set, DJ + dhol" error={errors.performanceType}>
                  {(p) => <TextInput {...p} name="performanceType" value={values.performanceType} onChange={(e) => set("performanceType", e.target.value)} />}
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Performers" optional error={errors.performersCount}>
                    {(p) => (
                      <TextInput {...p} name="performersCount" type="number" inputMode="numeric" min={1} max={200} value={values.performersCount} onChange={(e) => set("performersCount", e.target.value)} />
                    )}
                  </Field>
                  <Field label="Duration" optional error={errors.durationMinutes}>
                    {(p) => (
                      <SelectInput {...p} name="durationMinutes" value={values.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)}>
                        <option value="">Any</option>
                        {DURATIONS.map((d) => (
                          <option key={d} value={d}>
                            {d < 60 ? `${d} min` : `${d / 60} hr${d > 60 ? "s" : ""}`}
                          </option>
                        ))}
                      </SelectInput>
                    )}
                  </Field>
                </div>
                <Field label="Additional requirements" optional className="sm:col-span-2" error={errors.additionalRequirements}>
                  {(p) => (
                    <TextArea
                      {...p}
                      name="additionalRequirements"
                      placeholder="Song requests, languages, sound & lights, travel, timings…"
                      value={values.additionalRequirements}
                      onChange={(e) => set("additionalRequirements", e.target.value)}
                    />
                  )}
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Approximate budget" optional hint="Helps us suggest the right options" className="sm:col-span-2" error={errors.budget}>
                  {(p) => (
                    <SelectInput {...p} name="budget" value={values.budget} onChange={(e) => set("budget", e.target.value)}>
                      <option value="">Prefer not to say</option>
                      {BUDGET_RANGES.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </SelectInput>
                  )}
                </Field>
                <Field label="Your name" error={errors.name}>
                  {(p) => <TextInput {...p} name="name" autoComplete="name" value={values.name} onChange={(e) => set("name", e.target.value)} required />}
                </Field>
                <Field label="Email" error={errors.email}>
                  {(p) => (
                    <TextInput {...p} name="email" type="email" autoComplete="email" inputMode="email" value={values.email} onChange={(e) => set("email", e.target.value)} required />
                  )}
                </Field>
                <Field label="Phone number" error={errors.phone ?? errors.phoneCountryCode} hint="We'll call or WhatsApp you about your enquiry">
                  {(p) => (
                    <div className="flex gap-2">
                      <SelectInput
                        name="phoneCountryCode"
                        aria-label="Country code"
                        className="w-32 shrink-0"
                        value={values.phoneCountryCode}
                        onChange={(e) => set("phoneCountryCode", e.target.value)}
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      </SelectInput>
                      <TextInput {...p} name="phone" type="tel" autoComplete="tel-national" inputMode="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} required />
                    </div>
                  )}
                </Field>
                <Field label="Company / organisation" optional error={errors.organization}>
                  {(p) => <TextInput {...p} name="organization" autoComplete="organization" value={values.organization} onChange={(e) => set("organization", e.target.value)} />}
                </Field>
                <Field label="Anything else?" optional className="sm:col-span-2" error={errors.message}>
                  {(p) => <TextArea {...p} name="message" value={values.message} onChange={(e) => set("message", e.target.value)} />}
                </Field>
                <div className="sm:col-span-2">
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-ink/85">
                    <input
                      type="checkbox"
                      name="consent"
                      checked={values.consent}
                      onChange={(e) => set("consent", e.target.checked)}
                      aria-invalid={errors.consent ? true : undefined}
                      className="mt-0.5 size-5 shrink-0 accent-magenta"
                    />
                    <span>
                      I agree to be contacted by phone, WhatsApp or email about this enquiry. We never share your details with artists without
                      your permission.
                    </span>
                  </label>
                  {errors.consent && (
                    <p role="alert" className="mt-2 text-sm text-[#ff8fa3]">
                      {errors.consent}
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                {[
                  {
                    title: "Event",
                    step: 0,
                    rows: [
                      ["Type", values.eventType ? EVENT_TYPE_LABELS[values.eventType as EventType] : "—"],
                      ["Date", values.eventDate ? formatCalendarDate(values.eventDate) : "—"],
                      ["City", values.eventCity || "—"],
                      ["Venue", values.venue],
                      ["Audience", audienceLabel],
                    ],
                  },
                  {
                    title: "Entertainment",
                    step: 1,
                    rows: [
                      ["Category", categoryName ?? "Open to suggestions"],
                      ["Artist", artistName ?? "No preference"],
                      ["Performance", values.performanceType],
                      ["Performers", values.performersCount],
                      ["Duration", values.durationMinutes ? `${values.durationMinutes} min` : undefined],
                      ["Requirements", values.additionalRequirements],
                    ],
                  },
                  {
                    title: "Contact",
                    step: 2,
                    rows: [
                      ["Budget", budgetLabel],
                      ["Name", values.name],
                      ["Email", values.email],
                      ["Phone", `${values.phoneCountryCode} ${values.phone}`],
                      ["Organisation", values.organization],
                      ["Message", values.message],
                    ],
                  },
                ].map((section) => (
                  <section key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg font-semibold text-ink">{section.title}</h3>
                      <button type="button" onClick={() => goTo(section.step)} className="focus-ring inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-violet-glow hover:text-ink">
                        <Pencil className="size-3.5" aria-hidden="true" /> Edit<span className="sr-only"> {section.title.toLowerCase()}</span>
                      </button>
                    </div>
                    <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
                      {section.rows
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div key={k} className="contents">
                            <dt className="text-haze">{k}</dt>
                            <dd className="break-words whitespace-pre-line text-ink">{v}</dd>
                          </div>
                        ))}
                    </dl>
                  </section>
                ))}
                {turnstileSiteKey && <Turnstile siteKey={turnstileSiteKey} onToken={setCaptcha} />}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {formError && (
          <p role="alert" className="mt-8 rounded-2xl border border-[#ff8fa3]/40 bg-[#ff8fa3]/10 px-5 py-4 text-sm text-[#ffc2cd]">
            {formError}
          </p>
        )}

        <div className="mt-10 flex items-center justify-between gap-4 border-t border-white/10 pt-8">
          {step > 0 ? (
            <button type="button" onClick={() => goTo(step - 1)} className="focus-ring inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-medium text-ink hover:bg-white/5">
              <ArrowLeft className="size-4" aria-hidden="true" /> Back
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={submitting}
            className="focus-ring inline-flex h-13 items-center gap-2 rounded-full bg-gradient-to-r from-electric via-[#9b4dff] to-magenta px-8 text-sm font-semibold text-white shadow-[0_10px_40px_-10px_rgb(233_53_193/0.6)] transition-shadow hover:shadow-[0_14px_50px_-8px_rgb(233_53_193/0.8)] disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Sending…
              </>
            ) : step < 3 ? (
              <>
                Continue <ArrowRight className="size-4" aria-hidden="true" />
              </>
            ) : (
              <>
                Send enquiry <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
