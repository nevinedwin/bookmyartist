import type { Permission } from "@/server/auth/permissions";

/**
 * Admin navigation. Only modules that exist are listed — no placeholder links.
 * `permission` hides an item the user can't use; it is a convenience, not
 * access control (pages and services check permissions themselves).
 */
export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/admin/enquiries", label: "Enquiries", icon: "enquiries", permission: "enquiry:read" },
  { href: "/admin/notifications", label: "Notifications", icon: "notifications" },
  { href: "/admin/users", label: "Team & access", icon: "users", permission: "user:manage" },
  { href: "/admin/account", label: "My account", icon: "account" },
] as const satisfies readonly {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  permission?: Permission;
}[];

export type AdminNavIcon = (typeof ADMIN_NAV)[number]["icon"];
