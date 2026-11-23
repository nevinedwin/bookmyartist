import { NotFoundView } from "@/components/stage/not-found-view";
import { SiteFooter } from "@/components/stage/site-footer";
import { SiteHeader } from "@/components/stage/site-header";

/** Root not-found for unmatched URLs (and proxy 404 rewrites), styled like the public site. */
export default function RootNotFound() {
  return (
    <div className="stage flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <NotFoundView />
      </main>
      <SiteFooter />
    </div>
  );
}
