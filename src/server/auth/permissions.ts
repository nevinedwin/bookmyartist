/**
 * Permission catalogue and default role grants. Roles and grants are stored in
 * the database (seeded from here) so new roles can be added without code
 * changes; code always checks *permissions*, never role names.
 *
 * This module is plain data so the seed script can import it.
 */

export const PERMISSIONS = {
  "enquiry:read": "View enquiries",
  "enquiry:write": "Create and edit enquiries",
  "enquiry:reopen": "Re-open closed enquiries",
  "enquiry:delete": "Permanently delete enquiries (spam, tests, duplicates)",
  "artist:read": "View artists",
  "artist:write": "Create and edit artists",
  "artist:internal": "View confidential artist rates, contacts and notes",
  "artist:delete": "Permanently delete artists that have no history",
  "client:read": "View clients",
  "client:write": "Create and edit clients",
  "booking:read": "View bookings and the calendar",
  "booking:write": "Create and edit bookings and schedules",
  "quotation:read": "View quotations",
  "quotation:write": "Create, edit and send quotations",
  "finance:read": "View invoices, payments, payouts, expenses and margins",
  "finance:write": "Record payments, payouts, expenses and issue invoices",
  "report:read": "View reports and export CSV",
  "task:read": "View tasks",
  "task:write": "Create and edit tasks",
  "settings:write": "Edit business settings",
  "user:manage": "Manage users, roles and sessions",
  "user:delete": "Delete team members' accounts",
  "audit:read": "View the audit log",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const SYSTEM_ROLES = {
  SUPER_ADMIN: {
    name: "Super admin",
    description: "Full access, including user management.",
    permissions: ALL_PERMISSIONS,
  },
  ADMIN: {
    name: "Admin",
    description: "Runs the agency day to day; full access except deleting accounts.",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "user:delete"),
  },
  MANAGER: {
    name: "Manager",
    description: "Manages enquiries, artists and bookings; read-only finance.",
    permissions: [
      "enquiry:read", "enquiry:write", "enquiry:reopen",
      "artist:read", "artist:write", "artist:internal",
      "client:read", "client:write",
      "booking:read", "booking:write",
      "quotation:read", "quotation:write",
      "finance:read", "report:read",
      "task:read", "task:write",
    ],
  },
  STAFF: {
    name: "Staff",
    description: "Handles enquiries, clients and bookings. No financial or confidential artist data.",
    permissions: [
      "enquiry:read", "enquiry:write",
      "artist:read",
      "client:read", "client:write",
      "booking:read", "booking:write",
      "quotation:read", "quotation:write",
      "task:read", "task:write",
    ],
  },
  FINANCE: {
    name: "Finance",
    description: "Invoices, payments, payouts, expenses and reports.",
    permissions: [
      "enquiry:read", "artist:read", "artist:internal",
      "client:read", "booking:read", "quotation:read",
      "finance:read", "finance:write", "report:read",
      "task:read", "task:write", "audit:read",
    ],
  },
} as const satisfies Record<string, { name: string; description: string; permissions: readonly Permission[] }>;

export type SystemRoleKey = keyof typeof SYSTEM_ROLES;
