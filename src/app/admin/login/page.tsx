import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthFrame } from "@/components/desk/auth/auth-frame";
import { LoginForm } from "@/components/desk/auth/login-form";
import { getActor } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthFrame title="Sign in" description="Use the work email your admin registered for you.">
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <Suspense fallback={<div className="h-72" />}>
        <LoginForm />
      </Suspense>
    </AuthFrame>
  );
}

/** Already signed in with a valid session → straight to the dashboard. */
async function RedirectIfSignedIn() {
  if (await getActor()) redirect("/admin");
  return null;
}
