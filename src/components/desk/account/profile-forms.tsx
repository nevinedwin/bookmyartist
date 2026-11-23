"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeOwnEmailAction, updateOwnProfileAction } from "@/server/actions/auth";
import { useActionRunner } from "../enquiries/use-action";

type Errors = Record<string, string[] | undefined>;

function FieldError({ id, errors }: { id: string; errors: Errors }) {
  const msg = errors[id]?.[0];
  return msg ? (
    <p id={`${id}-error`} className="text-sm text-destructive">
      {msg}
    </p>
  ) : null;
}

export function ProfileForm({ name: initialName, phone: initialPhone }: { name: string; phone: string | null }) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const { pending, run } = useActionRunner();
  const changed = name.trim() !== initialName || phone.trim() !== (initialPhone ?? "");

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setErrors({});
        const r = await run(() => updateOwnProfileAction({ name, phone }), "Profile saved");
        if (!r.ok && r.error.fieldErrors) setErrors(r.error.fieldErrors);
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="profile-name">Name</Label>
        <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" aria-invalid={!!errors.name} />
        <FieldError id="name" errors={errors} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="profile-phone">
          Phone <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="profile-phone"
          type="tel"
          inputMode="tel"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={24}
          autoComplete="tel"
          aria-invalid={!!errors.phone}
        />
        <FieldError id="phone" errors={errors} />
      </div>
      <div>
        <Button type="submit" disabled={pending || !changed}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Save profile
        </Button>
      </div>
    </form>
  );
}

export function EmailForm({ email: currentEmail }: { email: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const { pending, run } = useActionRunner();

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setErrors({});
        const r = await run(
          () => changeOwnEmailAction({ email, currentPassword: password }),
          (d) => `Email changed. Use it next time you sign in.${d.revokedSessions ? ` ${d.revokedSessions} other session${d.revokedSessions === 1 ? "" : "s"} signed out.` : ""}`,
        );
        setPassword("");
        if (r.ok) setEmail("");
        else if (r.error.fieldErrors) setErrors(r.error.fieldErrors);
      }}
    >
      <p className="text-sm">
        Signed in as <span className="font-medium break-all">{currentEmail}</span>
      </p>
      <div className="grid gap-2">
        <Label htmlFor="new-email">New email</Label>
        <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={!!errors.email} />
        <FieldError id="email" errors={errors} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email-password">Current password</Label>
        <Input
          id="email-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          aria-invalid={!!errors.currentPassword}
        />
        <FieldError id="currentPassword" errors={errors} />
      </div>
      <div>
        <Button type="submit" variant="outline" disabled={pending || !email.trim() || !password}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Change email
        </Button>
      </div>
    </form>
  );
}
