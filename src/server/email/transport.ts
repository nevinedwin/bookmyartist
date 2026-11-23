import "server-only";
import { env } from "@/server/env";

export type SendResult =
  | { status: "sent"; providerMessageId: string | null }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string; retryable: boolean };

export function isEmailConfigured(): boolean {
  return Boolean(env().RESEND_API_KEY && env().EMAIL_FROM);
}

/** Send through the Resend HTTP API. No SDK needed. */
export async function sendEmail(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}): Promise<SendResult> {
  const { RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO } = env();
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    return { status: "skipped", reason: "Email provider not configured (RESEND_API_KEY / EMAIL_FROM)." };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(EMAIL_REPLY_TO ? { reply_to: EMAIL_REPLY_TO } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const json = (await res.json().catch(() => ({}))) as { id?: string };
      return { status: "sent", providerMessageId: json.id ?? null };
    }
    const detail = await res.text().catch(() => "");
    // 4xx (except 429) are permanent: bad address, unverified domain, etc.
    const retryable = res.status === 429 || res.status >= 500;
    return { status: "failed", error: `Resend ${res.status}: ${detail.slice(0, 300)}`, retryable };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Network error", retryable: true };
  }
}
