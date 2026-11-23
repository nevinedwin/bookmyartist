"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_MIN } from "@/lib/validation/auth";
import { changePasswordAction } from "@/server/actions/auth";

const FIELDS = [
  { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
  { name: "newPassword", label: "New password", autoComplete: "new-password", hint: `At least ${PASSWORD_MIN} characters. A short sentence works well.` },
  { name: "confirmPassword", label: "Repeat new password", autoComplete: "new-password" },
] as const;

export function ChangePasswordForm({ currentLabel = "Current password" }: { currentLabel?: string }) {
  const [state, formAction, pending] = useActionState(changePasswordAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state && !state.ok ? state.error.fieldErrors ?? {} : {};

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      const revoked = (state.data as { revokedSessions: number }).revokedSessions;
      toast.success(revoked ? `Password changed. ${revoked} other session${revoked === 1 ? "" : "s"} signed out.` : "Password changed.");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4" noValidate>
      {FIELDS.map((f) => {
        const err = errors[f.name]?.[0];
        const label = f.name === "currentPassword" ? currentLabel : f.label;
        return (
          <div key={f.name} className="grid gap-2">
            <Label htmlFor={f.name}>{label}</Label>
            <Input
              id={f.name}
              name={f.name}
              type="password"
              autoComplete={f.autoComplete}
              required
              maxLength={128}
              className="h-10"
              aria-invalid={!!err}
              aria-describedby={err ? `${f.name}-error` : "hint" in f ? `${f.name}-hint` : undefined}
            />
            {err ? (
              <p id={`${f.name}-error`} className="text-sm text-destructive">
                {err}
              </p>
            ) : "hint" in f ? (
              <p id={`${f.name}-hint`} className="text-xs text-muted-foreground">
                {f.hint}
              </p>
            ) : null}
          </div>
        );
      })}
      {state && !state.ok && !state.error.fieldErrors ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error.message}
        </p>
      ) : null}
      <Button type="submit" className="h-10" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        Change password
      </Button>
    </form>
  );
}
