import { Suspense } from "react";
import { DeskSidebar, type DeskNavItem } from "@/components/desk/desk-sidebar";
import { UserMenu } from "@/components/desk/user-menu";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ADMIN_NAV } from "@/config/admin-nav";
import { can } from "@/server/auth/actor";
import { requireActor } from "@/server/auth/dal";
import { countUnreadNotifications } from "@/server/services/admin/notifications";

/**
 * Desk shell. The session is read inside Suspense boundaries so the frame is
 * part of the static shell. This layout is NOT the security boundary: every
 * page below calls the DAL itself.
 */
export default function DeskLayout({ children }: LayoutProps<"/admin">) {
  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider>
        <Suspense fallback={<SidebarFallback />}>
          <NavSidebar />
        </Suspense>
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur sm:px-5">
            <SidebarTrigger />
            <div className="flex-1" />
            <Suspense fallback={<Skeleton className="h-8 w-32 rounded-full" />}>
              <HeaderUser />
            </Suspense>
          </header>
          {/* SidebarInset is the <main> landmark; this is just the content column. */}
          <div id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

async function NavSidebar() {
  const actor = await requireActor();
  const unread = await countUnreadNotifications(actor);
  const items: DeskNavItem[] = ADMIN_NAV.filter(
    (item) => !("permission" in item) || can(actor, item.permission),
  ).map((item) => ({
    href: item.href,
    label: item.label,
    icon: item.icon,
    exact: "exact" in item ? item.exact : undefined,
    badge: item.icon === "notifications" ? unread : undefined,
  }));
  return <DeskSidebar items={items} />;
}

async function HeaderUser() {
  const actor = await requireActor();
  return (
    <UserMenu name={actor.name} email={actor.email} roleName={actor.roleName} />
  );
}

function SidebarFallback() {
  return (
    <div
      className="hidden w-(--sidebar-width) shrink-0 border-r bg-sidebar md:block"
      aria-hidden="true"
    />
  );
}
