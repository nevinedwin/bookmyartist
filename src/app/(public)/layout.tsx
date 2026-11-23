import { SiteFooter } from "@/components/stage/site-footer";
import { SiteHeader } from "@/components/stage/site-header";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="stage flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
