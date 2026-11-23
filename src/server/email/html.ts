/** Minimal, safe HTML helpers for transactional email templates. */

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

export function nl2br(value: string): string {
  return esc(value).replace(/\n/g, "<br>");
}

/** Branded wrapper. Inline styles only — email clients ignore <style> unevenly. */
export function layout({ preheader, title, body, footer }: { preheader: string; title: string; body: string; footer: string }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f4f2fb;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#1b1830">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2fb;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0d0b1c;padding:28px 32px;color:#f6f4ff;font-size:13px;letter-spacing:0.5px;font-weight:700">BookMy<span style="color:#a78bfa">Artist</span><span style="color:#e935c1">.</span></td></tr>
<tr><td style="padding:32px">${body}</td></tr>
<tr><td style="padding:20px 32px;background:#faf9fd;color:#6b6788;font-size:12px;line-height:18px">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

export function row(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `<tr><td style="padding:6px 0;color:#6b6788;font-size:13px;width:40%;vertical-align:top">${esc(label)}</td><td style="padding:6px 0;font-size:14px">${esc(value)}</td></tr>`;
}

export function table(rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ece9f6;margin-top:16px">${rows}</table>`;
}

export function button(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;margin-top:24px;background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:14px">${esc(label)}</a>`;
}
