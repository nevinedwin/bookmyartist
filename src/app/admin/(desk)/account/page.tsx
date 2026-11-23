import type { Metadata } from "next";
import { Suspense } from "react";
import { EmailForm, ProfileForm } from "@/components/desk/account/profile-forms";
import { SessionList } from "@/components/desk/account/session-list";
import { ChangePasswordForm } from "@/components/desk/auth/change-password-form";
import { PageHeader } from "@/components/desk/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/time";
import { requireActor } from "@/server/auth/dal";
import { getOwnProfile, listOwnSessions } from "@/server/services/auth";

export const metadata: Metadata = { title: "My account" };

export default function AccountPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Account />
    </Suspense>
  );
}

/** A readable device label from the stored user agent (best effort, display only). */
function describeDevice(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

async function Account() {
  const actor = await requireActor();
  const [profile, sessions] = await Promise.all([getOwnProfile(actor), listOwnSessions(actor)]);
  return (
    <div className="grid gap-8">
      <PageHeader title="My account" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="profile-title" className="rounded-xl border bg-card p-5">
          <h2 id="profile-title" className="font-medium">Profile</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Role: {actor.roleName}. Ask an admin if your role should change.
          </p>
          <ProfileForm key={`${profile.name}|${profile.phone ?? ""}`} name={profile.name} phone={profile.phone} />
        </section>
        <section aria-labelledby="email-title" className="rounded-xl border bg-card p-5">
          <h2 id="email-title" className="font-medium">Sign-in email</h2>
          <p className="mb-4 text-sm text-muted-foreground">You sign in with this address. Changing it signs you out on other devices.</p>
          <EmailForm key={profile.email} email={profile.email} />
        </section>
        <section aria-labelledby="password-title" className="rounded-xl border bg-card p-5 lg:col-span-2 lg:max-w-[calc(50%-0.75rem)]">
          <h2 id="password-title" className="font-medium">Change password</h2>
          <p className="mb-4 text-sm text-muted-foreground">Changing it signs you out on every other device.</p>
          <ChangePasswordForm />
        </section>
      </div>
      <section aria-labelledby="sessions-title" className="grid gap-3">
        <div>
          <h2 id="sessions-title" className="font-medium">Where you&apos;re signed in</h2>
          <p className="text-sm text-muted-foreground">Sessions end after 12 hours of inactivity, and after 7 days regardless.</p>
        </div>
        <SessionList
          sessions={sessions.map((s) => ({
            id: s.id,
            current: s.current,
            device: describeDevice(s.userAgent),
            lastSeen: formatDateTime(s.lastSeenAt),
            started: formatDateTime(s.createdAt),
          }))}
        />
      </section>
    </div>
  );
}
