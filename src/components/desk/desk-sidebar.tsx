"use client";

import { Bell, CircleUser, ExternalLink, Inbox, LayoutDashboard, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { AdminNavIcon } from "@/config/admin-nav";

const ICONS: Record<AdminNavIcon, typeof Inbox> = {
  dashboard: LayoutDashboard,
  enquiries: Inbox,
  notifications: Bell,
  users: ShieldCheck,
  account: CircleUser,
};

export interface DeskNavItem {
  href: string;
  label: string;
  icon: AdminNavIcon;
  exact?: boolean;
  badge?: number;
}

export function DeskSidebar({ items }: { items: DeskNavItem[] }) {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-4 group-data-[collapsible=icon]:px-2">
        <Link href="/admin" className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <Logo className="text-base group-data-[collapsible=icon]:hidden" accentClassName="text-primary" />
          <span className="hidden font-display text-base font-bold group-data-[collapsible=icon]:inline" aria-label="BookMyArtist">
            B<span className="text-primary">.</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href} aria-current={active ? "page" : undefined}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge ? (
                      <SidebarMenuBadge aria-label={`${item.badge} unread`}>{item.badge > 99 ? "99+" : item.badge}</SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="View public website">
              <a href="/" target="_blank" rel="noreferrer">
                <ExternalLink />
                <span>View website</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
