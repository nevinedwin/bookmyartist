import { CheckCircle2, CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { NoAccess } from "@/components/desk/no-access";
import { PageHeader } from "@/components/desk/page-header";
import { AlertSettingsForm } from "@/components/desk/settings/alert-settings-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { actorWith } from "@/server/auth/dal";
import { getAlertSettings } from "@/server/services/admin/settings";

export const metadata: Metadata = { title: "Alert settings" };

export default function SettingsPage() {
  return (
    <div className="grid gap-6">
      <Suspense fallback={<Skeleton className="h-[32rem] rounded-xl" />}>
        <Settings />
      </Suspense>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  SENT: "text-emerald-700",
  PENDING: "text-sky-700",
  SENDING: "text-sky-700",
  FAILED: "text-rose-700",
  SKIPPED: "text-amber-800",
};

async function Settings() {
  const actor = await actorWith("settings:write");
  if (!actor) return <NoAccess what="settings" />;
  const s = await getAlertSettings(actor);

  return (
    <>
      <PageHeader title="Alert settings" description="Who hears about each new enquiry from the website, by email and WhatsApp." />

      <div className="grid gap-3 sm:grid-cols-2">
        <Provider
          ok={s.emailConfigured}
          name="Email (Resend)"
          okText="Connected. Customers also get an acknowledgement email."
          missing="Not connected: set RESEND_API_KEY and EMAIL_FROM. Until then emails are recorded as skipped, never faked."
        />
        <Provider
          ok={s.whatsappConfigured}
          name="WhatsApp (Meta Cloud API)"
          okText="Connected. Alerts use your approved “new enquiry” template."
          missing="Not connected: set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID, and get the template approved (see docs/DEPLOYMENT.md)."
        />
      </div>

      <section className="rounded-xl border bg-card p-5" aria-label="Recipients">
        <AlertSettingsForm emails={s.emails} whatsapp={s.whatsapp} />
      </section>

      <section className="rounded-xl border bg-card" aria-labelledby="log-title">
        <div className="p-5 pb-3">
          <h2 id="log-title" className="font-medium">Recent deliveries</h2>
          <p className="text-sm text-muted-foreground">The last messages sent or attempted, newest first. Failures are retried automatically.</p>
        </div>
        {s.recent.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Nothing sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.recent.map((m) => (
                  <TableRow key={`${m.channel}:${m.id}`}>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(m.createdAt)}</TableCell>
                    <TableCell className="text-sm">{m.channel === "email" ? "Email" : "WhatsApp"}</TableCell>
                    <TableCell className="text-sm">{m.to}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.template === "enquiry.received" ? "Customer acknowledgement" : "New enquiry alert"}</TableCell>
                    <TableCell className="max-w-72 text-xs">
                      <span className={cn("font-medium", STATUS_STYLES[m.status])}>{m.status.charAt(0) + m.status.slice(1).toLowerCase()}</span>
                      {m.lastError && m.status !== "SENT" ? <span className="block truncate text-muted-foreground" title={m.lastError}>{m.lastError}</span> : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </>
  );
}

function Provider({ ok, name, okText, missing }: { ok: boolean; name: string; okText: string; missing: string }) {
  const Icon = ok ? CheckCircle2 : CircleAlert;
  return (
    <div className={cn("flex gap-3 rounded-xl border p-4", ok ? "bg-card" : "border-amber-300 bg-amber-50 text-amber-950")}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", ok ? "text-emerald-600" : "text-amber-600")} aria-hidden="true" />
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className={cn("text-sm", ok ? "text-muted-foreground" : "")}>{ok ? okText : missing}</p>
      </div>
    </div>
  );
}
