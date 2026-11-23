"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { type FieldErrors, FormField, fieldAria } from "@/components/desk/form-field";
import { NativeSelect } from "@/components/desk/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { EventType } from "@/generated/prisma/enums";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { paiseToRupeeInput } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { IMAGE_HOSTS } from "@/lib/validation/common";
import { createArtistAction, updateArtistAction } from "@/server/actions/artists";
import type { ArtistProfileValues, CategoryOption } from "@/server/services/admin/artists";
import { useActionRunner } from "../enquiries/use-action";

type Values = Omit<ArtistProfileValues, "languages" | "performanceTypes" | "publicPriceFromPaise"> & {
  languages: string;
  performanceTypes: string;
  publicPriceFrom: string;
};

const EMPTY: Values = {
  stageName: "",
  slug: "",
  categoryId: "",
  tagline: "",
  shortBio: "",
  biography: "",
  performanceDescription: "",
  profileImageUrl: "",
  coverImageUrl: "",
  baseCity: "",
  languages: "",
  performanceTypes: "",
  eventTypes: [],
  technicalRequirements: "",
  teamSize: "",
  minDurationMinutes: "",
  maxDurationMinutes: "",
  publicPriceVisible: false,
  publicPriceFrom: "",
  publicPriceNote: "",
  publicContactApproved: false,
  publicEmail: "",
  publicPhone: "",
  isFeatured: false,
  featuredOrder: "0",
  seoTitle: "",
  seoDescription: "",
};

function toValues(p: ArtistProfileValues): Values {
  return {
    ...p,
    languages: p.languages.join(", "),
    performanceTypes: p.performanceTypes.join(", "),
    publicPriceFrom: paiseToRupeeInput(p.publicPriceFromPaise),
  };
}

export type ArtistProfileFormProps =
  | { mode: "create"; categories: CategoryOption[] }
  | { mode: "edit"; categories: CategoryOption[]; artistId: string; updatedAt: string; initial: ArtistProfileValues };

/** Public profile editor. Everything here can appear on the website once the artist is published. */
export function ArtistProfileForm(props: ArtistProfileFormProps) {
  const router = useRouter();
  const [v, setV] = useState<Values>(props.mode === "edit" ? toValues(props.initial) : EMPTY);
  const [slugEdited, setSlugEdited] = useState(props.mode === "edit");
  const [publishNow, setPublishNow] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { pending, run } = useActionRunner();

  const set = <K extends keyof Values>(key: K, value: Values[K]) => setV((prev) => ({ ...prev, [key]: value }));
  const err = (key: string) => errors[key]?.[0];
  const text = (key: keyof Values) => ({
    id: `artist-${key}`,
    value: v[key] as string,
    onChange: (e: { target: { value: string } }) => set(key, e.target.value as never),
    ...fieldAria(`artist-${key}`, err(key)),
  });

  const autoSlug = slugify(v.stageName);
  const categories = props.categories.filter((c) => c.isActive || c.id === v.categoryId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const payload = { ...v, slug: v.slug.trim() };
    const result =
      props.mode === "create"
        ? await run(() => createArtistAction({ ...payload, status: publishNow ? "ACTIVE" : "INACTIVE" }), "Artist added")
        : await run(() => updateArtistAction({ ...payload, artistId: props.artistId, expectedUpdatedAt: props.updatedAt }), "Profile saved");
    if (!result.ok) {
      if (result.error.fieldErrors) {
        setErrors(result.error.fieldErrors);
        // Bring the first problem into view.
        const first = Object.keys(result.error.fieldErrors)[0];
        if (first) document.getElementById(`artist-${first}`)?.focus();
      }
      return;
    }
    if (props.mode === "create" && "id" in result.data) router.push(`/admin/artists/${result.data.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6" noValidate>
      {err("_form") ? <p className="text-sm text-destructive">{err("_form")}</p> : null}

      <FormSection title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="artist-stageName" label="Stage name" error={err("stageName")}>
            <Input
              {...text("stageName")}
              maxLength={120}
              required
              onChange={(e) => {
                set("stageName", e.target.value);
                if (!slugEdited) set("slug", "");
              }}
            />
          </FormField>
          <FormField
            id="artist-slug"
            label="Web address"
            error={err("slug")}
            hint={
              <>
                /artists/<strong>{v.slug || autoSlug || "…"}</strong>
                {props.mode === "edit" ? " · changing it breaks old links" : v.slug ? "" : " · generated from the name"}
              </>
            }
          >
            <Input
              {...text("slug")}
              maxLength={80}
              placeholder={autoSlug}
              onChange={(e) => {
                setSlugEdited(true);
                set("slug", e.target.value.toLowerCase());
              }}
            />
          </FormField>
          <FormField id="artist-categoryId" label="Category" error={err("categoryId")}>
            <NativeSelect {...text("categoryId")} required>
              <option value="">Choose…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.isActive ? "" : " (hidden)"}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id="artist-baseCity" label="Base city" error={err("baseCity")}>
            <Input {...text("baseCity")} maxLength={80} required />
          </FormField>
          <FormField id="artist-tagline" label="Tagline" optional error={err("tagline")} className="sm:col-span-2">
            <Input {...text("tagline")} maxLength={140} placeholder="One line shown on the artist card" />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Story">
        <div className="grid gap-4">
          <FormField id="artist-shortBio" label="Short bio" error={err("shortBio")} hint={`${v.shortBio.length}/300 · shown on cards and in search results`}>
            <Textarea {...text("shortBio")} rows={2} maxLength={300} />
          </FormField>
          <FormField id="artist-biography" label="Biography" error={err("biography")} hint="Line breaks are kept.">
            <Textarea {...text("biography")} rows={8} maxLength={10_000} />
          </FormField>
          <FormField id="artist-performanceDescription" label="What a performance looks like" optional error={err("performanceDescription")}>
            <Textarea {...text("performanceDescription")} rows={4} maxLength={5000} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Performance">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="artist-performanceTypes" label="Performance types" optional error={err("performanceTypes")} hint="Comma-separated, e.g. Acoustic, Sufi, Live band">
            <Input {...text("performanceTypes")} />
          </FormField>
          <FormField id="artist-languages" label="Languages" optional error={err("languages")} hint="Comma-separated">
            <Input {...text("languages")} />
          </FormField>
          <fieldset className="grid gap-2 sm:col-span-2">
            <legend className="mb-1 text-sm font-medium">Events they play</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={v.eventTypes.includes(t)}
                    onChange={(e) => set("eventTypes", e.target.checked ? [...v.eventTypes, t] : v.eventTypes.filter((x) => x !== t))}
                  />
                  {EVENT_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Used for the service pages and the “event type” filter.</p>
          </fieldset>
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <FormField id="artist-teamSize" label="Team size" optional error={err("teamSize")}>
              <Input {...text("teamSize")} inputMode="numeric" />
            </FormField>
            <FormField id="artist-minDurationMinutes" label="Min. set (min)" optional error={err("minDurationMinutes")}>
              <Input {...text("minDurationMinutes")} inputMode="numeric" />
            </FormField>
            <FormField id="artist-maxDurationMinutes" label="Max. set (min)" optional error={err("maxDurationMinutes")}>
              <Input {...text("maxDurationMinutes")} inputMode="numeric" />
            </FormField>
          </div>
          <FormField id="artist-technicalRequirements" label="Technical requirements" optional error={err("technicalRequirements")} className="sm:col-span-2">
            <Textarea {...text("technicalRequirements")} rows={3} maxLength={5000} placeholder="Stage size, sound, power, green room…" />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Images" description={`Paste an https link from ${IMAGE_HOSTS.join(" or ")}. Uploads arrive with Cloudinary.`}>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["profileImageUrl", "coverImageUrl"] as const).map((key) => (
            <FormField key={key} id={`artist-${key}`} label={key === "profileImageUrl" ? "Profile photo" : "Cover image"} optional error={err(key)}>
              <Input {...text(key)} type="url" placeholder="https://res.cloudinary.com/…" />
              {v[key] && !err(key) ? (
                // Plain <img>: next/image would throw on a host it doesn't know before the server validates it.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v[key]} alt="" className="mt-1 h-24 w-full rounded-lg border object-cover" />
              ) : null}
            </FormField>
          ))}
        </div>
      </FormSection>

      <FormSection title="Public pricing & contact" description="Off unless the artist has agreed. Confidential rates live in the private section.">
        <div className="grid gap-5">
          <Toggle
            id="artist-publicPriceVisible"
            checked={v.publicPriceVisible}
            onChange={(c) => set("publicPriceVisible", c)}
            label="Show a starting price"
            hint="Also makes the artist appear under budget filters."
          />
          {v.publicPriceVisible ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="artist-publicPriceFrom" label="Starting from (₹)" error={err("publicPriceFrom")}>
                <Input {...text("publicPriceFrom")} inputMode="decimal" placeholder="75,000" />
              </FormField>
              <FormField id="artist-publicPriceNote" label="Price note" optional error={err("publicPriceNote")}>
                <Input {...text("publicPriceNote")} maxLength={200} placeholder="Excludes travel outside Mumbai" />
              </FormField>
            </div>
          ) : null}
          <Toggle
            id="artist-publicContactApproved"
            checked={v.publicContactApproved}
            onChange={(c) => set("publicContactApproved", c)}
            label="Show contact details on the profile"
            hint="Usually off — enquiries should come through the agency."
          />
          {v.publicContactApproved ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="artist-publicEmail" label="Public email" optional error={err("publicEmail")}>
                <Input {...text("publicEmail")} type="email" />
              </FormField>
              <FormField id="artist-publicPhone" label="Public phone" optional error={err("publicPhone")}>
                <Input {...text("publicPhone")} type="tel" />
              </FormField>
            </div>
          ) : null}
        </div>
      </FormSection>

      <FormSection title="Website placement">
        <div className="grid gap-5">
          <Toggle
            id="artist-isFeatured"
            checked={v.isFeatured}
            onChange={(c) => set("isFeatured", c)}
            label="Feature on the home page"
            hint="Featured artists also sort first in the directory."
          />
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr_1fr]">
            <FormField id="artist-featuredOrder" label="Feature order" error={err("featuredOrder")} hint="Lower first">
              <Input {...text("featuredOrder")} inputMode="numeric" disabled={!v.isFeatured} />
            </FormField>
            <FormField id="artist-seoTitle" label="Search title" optional error={err("seoTitle")} hint={`${v.seoTitle.length}/70`}>
              <Input {...text("seoTitle")} maxLength={70} placeholder={v.stageName ? `${v.stageName} — book for your event` : ""} />
            </FormField>
            <FormField id="artist-seoDescription" label="Search description" optional error={err("seoDescription")} hint={`${v.seoDescription.length}/160`}>
              <Input {...text("seoDescription")} maxLength={160} />
            </FormField>
          </div>
        </div>
      </FormSection>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        {props.mode === "create" ? (
          <label className="mr-auto flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
            Publish on the website now
          </label>
        ) : (
          <p className="mr-auto text-xs text-muted-foreground">Changes go live on the website as soon as you save.</p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {props.mode === "create" ? "Add artist" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5" aria-label={title}>
      <h2 className="font-medium">{title}</h2>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Toggle({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={hint ? `${id}-hint` : undefined} className="mt-0.5" />
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
