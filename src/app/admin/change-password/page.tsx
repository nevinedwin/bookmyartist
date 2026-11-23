import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthFrame } from "@/components/desk/auth/auth-frame";
import { ChangePasswordForm } from "@/components/desk/auth/change-password-form";
import { requireActor } from "@/server/auth/dal";
import { logoutAction } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Set your password" };

/** First sign-in with a temporary password: the only admin screen available until it's changed. */
export default function ChangePasswordPage() {
  return (
    <AuthFrame title="Set your password" description="You signed in with a temporary password. Choose your own to continue.">
      <Suspense fallback={<div className="h-96" />}>
        <Gate />
      </Suspense>
      <form action={logoutAction} className="mt-6">
        <button type="submit" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          Sign out instead
        </button>
      </form>
    </AuthFrame>
  );
}

async function Gate() {
  const actor = await requireActor({ allowPendingPasswordChange: true });
  if (!actor.mustChangePassword) redirect("/admin/account");
  return <ChangePasswordForm currentLabel="Temporary password" />;
}
