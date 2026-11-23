import "server-only";
import type { SendResult } from "@/server/email/transport";
import { env } from "@/server/env";
import { templateParam } from "./templates";

export function isWhatsAppConfigured(): boolean {
  return Boolean(env().WHATSAPP_ACCESS_TOKEN && env().WHATSAPP_PHONE_NUMBER_ID);
}

/** Send an approved template message through the WhatsApp Cloud API. No SDK needed. */
export async function sendWhatsAppTemplate(message: { to: string; template: string; params: string[] }): Promise<SendResult> {
  const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_LANGUAGE, WHATSAPP_API_VERSION } = env();
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    return { status: "skipped", reason: "WhatsApp not configured (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)." };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: message.to.replace(/^\+/, ""),
        type: "template",
        template: {
          name: message.template,
          language: { code: WHATSAPP_TEMPLATE_LANGUAGE },
          components: [{ type: "body", parameters: message.params.map((text) => ({ type: "text", text: templateParam(text) })) }],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[]; error?: { message?: string; code?: number } };
    if (res.ok) return { status: "sent", providerMessageId: json.messages?.[0]?.id ?? null };
    // Meta reports throttling as 429 or error code 4/80007/130429; those and 5xx are worth retrying.
    const code = json.error?.code;
    const retryable = res.status === 429 || res.status >= 500 || code === 4 || code === 80007 || code === 130429;
    return { status: "failed", error: `WhatsApp ${res.status}${code ? ` (${code})` : ""}: ${(json.error?.message ?? "").slice(0, 300)}`, retryable };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Network error", retryable: true };
  }
}
