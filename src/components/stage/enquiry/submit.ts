import type { ApiResult } from "@/lib/api";

export type SubmitOutcome =
  | { status: "success"; reference: string }
  | { status: "invalid"; message: string; fieldErrors: Record<string, string> }
  | { status: "error"; message: string };

/** POST an enquiry to the public API and normalise the response. */
export async function submitEnquiry(payload: Record<string, unknown>): Promise<SubmitOutcome> {
  let res: Response;
  try {
    res = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { status: "error", message: "We couldn't reach our server. Please check your connection and try again." };
  }
  let body: ApiResult<{ reference: string }> | undefined;
  try {
    body = (await res.json()) as ApiResult<{ reference: string }>;
  } catch {
    body = undefined;
  }
  if (body?.ok) return { status: "success", reference: body.data.reference };
  if (body && !body.ok) {
    const fieldErrors: Record<string, string> = {};
    for (const [k, v] of Object.entries(body.error.fieldErrors ?? {})) if (v?.[0]) fieldErrors[k] = v[0];
    if (Object.keys(fieldErrors).length > 0) return { status: "invalid", message: body.error.message, fieldErrors };
    return { status: "error", message: body.error.message };
  }
  return { status: "error", message: "Something went wrong. Please try again." };
}
