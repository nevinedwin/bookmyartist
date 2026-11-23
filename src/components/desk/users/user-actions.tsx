"use client";

import { KeyRound, LogOut, MoreHorizontal, Pencil, ShieldCheck, Trash2, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { NativeSelect } from "@/components/desk/native-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeUserRoleAction,
  deleteUserAction,
  resetUserPasswordAction,
  setUserStatusAction,
  signOutUserEverywhereAction,
  updateUserDetailsAction,
} from "@/server/actions/users";
import { useActionRunner } from "../enquiries/use-action";
import { TempPasswordDialog } from "./temp-password-dialog";

type Confirm = "reset" | "disable" | "enable" | "signout" | null;

export function UserActions({
  user,
  roles,
  canDelete,
}: {
  user: { id: string; name: string; email: string; phone: string | null; status: "ACTIVE" | "DISABLED"; roleKey: string };
  roles: { key: string; name: string }[];
  canDelete: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleKey, setRoleKey] = useState(user.roleKey);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const { pending, run } = useActionRunner();

  const copy: Record<Exclude<Confirm, null>, { title: string; body: string; cta: string }> = {
    reset: {
      title: `Reset ${user.name}'s password?`,
      body: "They'll be signed out everywhere and get a new temporary password. Their account is also unlocked.",
      cta: "Reset password",
    },
    disable: {
      title: `Disable ${user.name}?`,
      body: "They'll be signed out immediately and can't sign in until re-enabled. Their history is kept.",
      cta: "Disable account",
    },
    enable: { title: `Re-enable ${user.name}?`, body: "They'll be able to sign in again with their existing password.", cta: "Enable account" },
    signout: { title: `Sign ${user.name} out everywhere?`, body: "All of their active sessions end now.", cta: "Sign out" },
  };

  async function confirmAction() {
    const which = confirm;
    setConfirm(null);
    if (which === "reset") {
      const r = await run(() => resetUserPasswordAction({ userId: user.id }), "Password reset");
      if (r.ok) setTempPassword(r.data.temporaryPassword);
    } else if (which === "disable" || which === "enable") {
      await run(
        () => setUserStatusAction({ userId: user.id, status: which === "disable" ? "DISABLED" : "ACTIVE" }),
        which === "disable" ? "Account disabled" : "Account enabled",
      );
    } else if (which === "signout") {
      await run(() => signOutUserEverywhereAction({ userId: user.id }), (d) => `${d.revoked} session${d.revoked === 1 ? "" : "s"} ended`);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={`Actions for ${user.name}`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil /> Edit details
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setRoleOpen(true)}>
            <ShieldCheck /> Change role
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirm("reset")}>
            <KeyRound /> Reset password
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirm("signout")}>
            <LogOut /> Sign out everywhere
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {user.status === "ACTIVE" ? (
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("disable")}>
              <UserX /> Disable account
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setConfirm("enable")}>
              <UserCheck /> Enable account
            </DropdownMenuItem>
          )}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 /> Delete account
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          {confirm ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{copy[confirm].title}</AlertDialogTitle>
                <AlertDialogDescription>{copy[confirm].body}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant={confirm === "disable" ? "destructive" : "default"} onClick={confirmAction}>
                  {copy[confirm].cta}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change {user.name}&apos;s role</DialogTitle>
            <DialogDescription>Takes effect on their next page load.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`role-${user.id}`}>Role</Label>
            <NativeSelect id={`role-${user.id}`} value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || roleKey === user.roleKey}
              onClick={async () => {
                const r = await run(() => changeUserRoleAction({ userId: user.id, roleKey }), "Role updated");
                if (r.ok) setRoleOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TempPasswordDialog password={tempPassword} who={user.name} onClose={() => setTempPassword(null)} />
      {editOpen ? <EditDetailsDialog user={user} onClose={() => setEditOpen(false)} /> : null}
      {deleteOpen ? <DeleteUserDialog user={user} onClose={() => setDeleteOpen(false)} /> : null}
    </>
  );
}

type Errors = Record<string, string[] | undefined>;

function EditDetailsDialog({ user, onClose }: { user: { id: string; name: string; email: string; phone: string | null }; onClose: () => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const { pending, run } = useActionRunner();
  const emailChanged = email.trim().toLowerCase() !== user.email;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setErrors({});
            const r = await run(() => updateUserDetailsAction({ userId: user.id, name, email, phone }), (d) =>
              d.revokedSessions ? `Details saved. ${user.name} was signed out to use the new email.` : "Details saved",
            );
            if (r.ok) onClose();
            else if (r.error.fieldErrors) setErrors(r.error.fieldErrors);
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit {user.name}</DialogTitle>
            <DialogDescription>Name, sign-in email and phone number.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`edit-name-${user.id}`}>Name</Label>
            <Input id={`edit-name-${user.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} aria-invalid={!!errors.name} />
            {errors.name?.[0] ? <p className="text-sm text-destructive">{errors.name[0]}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-email-${user.id}`}>Sign-in email</Label>
            <Input id={`edit-email-${user.id}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
            {errors.email?.[0] ? (
              <p className="text-sm text-destructive">{errors.email[0]}</p>
            ) : emailChanged ? (
              <p className="text-xs text-muted-foreground">They&apos;ll be signed out and must sign in with the new email.</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-phone-${user.id}`}>
              Phone <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id={`edit-phone-${user.id}`}
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={24}
              aria-invalid={!!errors.phone}
            />
            {errors.phone?.[0] ? <p className="text-sm text-destructive">{errors.phone[0]}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({ user, onClose }: { user: { id: string; name: string; email: string }; onClose: () => void }) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { pending, run } = useActionRunner();
  const matches = confirmEmail.trim().toLowerCase() === user.email;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            const r = await run(() => deleteUserAction({ userId: user.id, confirmEmail }), `${user.name}'s account was deleted`);
            if (r.ok) onClose();
            else if (r.error.fieldErrors) setError(r.error.fieldErrors.confirmEmail?.[0] ?? r.error.message);
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete {user.name}&apos;s account?</DialogTitle>
            <DialogDescription>This can&apos;t be undone from the dashboard.</DialogDescription>
          </DialogHeader>
          <ul className="grid gap-1.5 text-sm text-muted-foreground">
            <li>· They&apos;re signed out now and can never sign in with this account again.</li>
            <li>· Their open enquiries become unassigned.</li>
            <li>· Their name stays on past notes and timeline entries, so history still makes sense.</li>
            <li>· Their email can be used for a new account.</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Only need to stop access for a while? Use <span className="font-medium text-foreground">Disable account</span> instead.
          </p>
          <div className="grid gap-2">
            <Label htmlFor={`delete-confirm-${user.id}`}>
              Type <span className="font-mono">{user.email}</span> to confirm
            </Label>
            <Input
              id={`delete-confirm-${user.id}`}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!error}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={!matches || pending}>
              <Trash2 aria-hidden="true" /> Delete account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
