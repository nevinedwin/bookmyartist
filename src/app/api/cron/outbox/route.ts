import { NextResponse, type NextRequest } from "next/server";
import { purgeDeadSessions } from "@/server/auth/session";
import { deliverPendingEmails } from "@/server/email/outbox";
import { deliverPendingWhatsApp } from "@/server/whatsapp/outbox";
import { env } from "@/server/env";
import { safeEqual } from "@/server/security/crypto";
import { purgeExpiredRateLimits } from "@/server/security/rate-limit";

/** Vercel Cron: delivers and retries queued emails and WhatsApp messages, and purges dead rate-limit buckets and sessions. Authorised with CRON_SECRET. */
export async function GET(request: NextRequest) {
  const secret = env().CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const [emails, whatsapp, purged, purgedSessions] = await Promise.all([
    deliverPendingEmails(50),
    deliverPendingWhatsApp(50),
    purgeExpiredRateLimits(),
    purgeDeadSessions(),
  ]);
  return NextResponse.json(
    { ok: true, emails, whatsapp, purgedRateLimitBuckets: purged, purgedSessions },
    { headers: { "Cache-Control": "no-store" } },
  );
}
