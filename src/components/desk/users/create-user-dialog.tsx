"use client";

import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { NativeSelect } from "@/components/desk/native-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserAction } from "@/server/actions/users";
import { useActionRunner } from "../enquiries/use-action";
import { TempPasswordDialog } from "./temp-password-dialog";

export function CreateUserDialog({ roles }: { roles: { key: string; name: string; description: string | null }[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState(roles.find((r) => r.key === "STAFF")?.key ?? roles[0]?.key ?? "");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [created, setCreated] = useState<{ password: string; who: string } | null>(null);
  const { pending, run } = useActionRunner();
  const role = roles.find((r) => r.key === roleKey);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <UserPlus aria-hidden="true" /> Add team member
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setErrors({});
              const r = await run(() => createUserAction({ name, email, roleKey }), "Team member added");
              if (r.ok) {
                setCreated({ password: r.data.temporaryPassword, who: name });
                setOpen(false);
                setName("");
                setEmail("");
              } else if (r.error.fieldErrors) {
                setErrors(r.error.fieldErrors);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Add team member</DialogTitle>
              <DialogDescription>They&apos;ll get a temporary password to change at first sign-in.</DialogDescription>
            </DialogHeader>
            <Field id="new-name" label="Name" error={errors.name?.[0]}>
              <Input id="new-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="off" />
            </Field>
            <Field id="new-email" label="Work email" error={errors.email?.[0]}>
              <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
            </Field>
            <Field id="new-role" label="Role" error={errors.roleKey?.[0]}>
              <NativeSelect id="new-role" value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
                {roles.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </NativeSelect>
              {role?.description ? <p className="text-xs text-muted-foreground">{role.description}</p> : null}
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <TempPasswordDialog password={created?.password ?? null} who={created?.who ?? ""} onClose={() => setCreated(null)} />
    </>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
