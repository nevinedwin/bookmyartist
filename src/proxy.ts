import { NextResponse, type NextRequest } from "next/server";
import { SERVICES } from "@/content/services";
import { SESSION_COOKIE } from "@/server/auth/cookie";
import { activeArtistSlugs } from "@/server/services/public/artist-slugs";

/**
 * Runs before rendering. With Cache Components, pages start streaming a 200
 * before request-time checks run, so real 404 status codes for unknown slugs
 * must be decided here (see docs/DECISIONS.md ADR-015).
 *
 * It also sends visitors without a session cookie straight to the admin login
 * page. That is only a UX shortcut: it checks the cookie exists, not that it
 * is valid. Every admin page, Server Action and service verifies the session
 * and permissions itself (src/server/auth/dal.ts).
 */
const SERVICE_SLUGS = new Set(SERVICES.map((s) => s.slug));
const NOT_FOUND_PATH = "/__not-found";

function notFound(request: NextRequest) {
  return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url), { status: 404 });
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [, section, slug] = pathname.split("/");

  if (section === "admin") {
    if (pathname === "/admin/login" || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
    const login = new URL("/admin/login", request.url);
    if (pathname !== "/admin") login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (!slug) return NextResponse.next();

  if (section === "services" && !SERVICE_SLUGS.has(slug)) return notFound(request);

  if (section === "artists") {
    try {
      if (!(await activeArtistSlugs()).has(slug)) return notFound(request);
    } catch {
      // Database unavailable: let the page render (it shows not-found UI with noindex).
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/services/:slug", "/artists/:slug", "/admin", "/admin/:path*"],
};
