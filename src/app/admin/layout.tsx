import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: { default: `Admin · ${siteConfig.name}`, template: `%s · ${siteConfig.name} Admin` },
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" };

/** Admin root ("Desk"): light neutral theme, separate from the public Stage design. */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {children}
      <Toaster theme="light" position="bottom-right" richColors closeButton />
    </div>
  );
}
