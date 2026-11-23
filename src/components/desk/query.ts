/** Rebuild a list URL's query string from the current params plus overrides (null removes a key). */
export function toQuery(raw: Record<string, string | string[] | undefined>, overrides: Record<string, string | null> = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string" && v) sp.set(k, v);
  for (const [k, v] of Object.entries(overrides)) {
    if (v) sp.set(k, v);
    else sp.delete(k);
  }
  return sp.size ? `?${sp}` : "";
}
