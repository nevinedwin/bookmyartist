import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok, type ApiResult } from "@/lib/api";
import { businessToday } from "@/lib/time";
import { publicEnquirySchema } from "@/lib/validation/enquiry";
import { deliverPendingEmails } from "@/server/email/outbox";
import { env } from "@/server/env";
import { hashIp } from "@/server/security/crypto";
import { verifyFormToken } from "@/server/security/form-token";
import { rateLimit } from "@/server/security/rate-limit";
import { getClientIp, getUserAgent } from "@/server/security/request";
import { verifyTurnstile } from "@/server/security/turnstile";
import { createPublicEnquiry, type EnquiryReceipt } from "@/server/services/public/enquiries";

const MAX_BODY_BYTES = 20_000;

function json<T>(body: ApiResult<T>, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients; other defences still apply
  try {
    return new URL(origin).host === new URL(env().NEXT_PUBLIC_SITE_URL).host || new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return json(fail("forbidden", "Cross-origin submissions are not allowed."), 403);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json(fail("unsupported_media_type", "Expected JSON."), 415);
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) {
    return json(fail("payload_too_large", "Your message is too long."), 413);
  }

  const ip = getClientIp(request.headers);
  const ipHash = hashIp(ip) ?? "unknown";

  const [burst, daily] = await Promise.all([
    rateLimit("enquiry:10m", ipHash, 5, 600),
    rateLimit("enquiry:1d", ipHash, 20, 86_400),
  ]);
  if (!burst.allowed || !daily.allowed) {
    const resetAt = (!burst.allowed ? burst : daily).resetAt;
    const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
    return json(
      fail("rate_limited", "You've sent several enquiries in a short time. Please try again a little later or call us."),
      429,
      { "Retry-After": String(retryAfter) },
    );
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json(fail("payload_too_large", "Your message is too long."), 413);
    body = JSON.parse(text);
  } catch {
    return json(fail("invalid_json", "We couldn't read your submission."), 400);
  }

  const parsed = publicEnquirySchema(businessToday()).safeParse(body);
  if (!parsed.success) {
    // Honeypot trips are reported generically so bots learn nothing.
    const flat = z.flattenError(parsed.error);
    if (flat.fieldErrors.website) {
      return json(fail("rejected", "We couldn't accept this submission. Please contact us directly."), 422);
    }
    return json(fail("validation_error", "Please check the highlighted fields.", flat.fieldErrors), 422);
  }
  const input = parsed.data;

  const token = verifyFormToken(input.formToken);
  if (!token.ok) {
    const message =
      token.reason === "expired"
        ? "This form has expired. Please refresh the page and try again."
        : "We couldn't verify this submission. Please refresh the page and try again.";
    return json(fail(`form_${token.reason}`, message), 422);
  }

  if (!(await verifyTurnstile(input.turnstileToken, ip))) {
    return json(fail("captcha_failed", "Please complete the verification and try again."), 422);
  }

  let receipt: EnquiryReceipt;
  try {
    receipt = await createPublicEnquiry(input, { ipHash, userAgent: getUserAgent(request.headers) });
  } catch (error) {
    console.error("[enquiries] failed to create enquiry", error instanceof Error ? error.message : error);
    return json(
      fail("server_error", "Something went wrong on our side. Your enquiry was not saved — please try again or call us."),
      500,
    );
  }

  // Deliver confirmation emails after responding; failures are retried by cron.
  after(async () => {
    try {
      await deliverPendingEmails(10);
    } catch (error) {
      console.error("[enquiries] email delivery pass failed", error instanceof Error ? error.message : error);
    }
  });

  return json(ok(receipt), 201);
}
