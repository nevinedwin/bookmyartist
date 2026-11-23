import type { Metadata } from "next";
import { Suspense } from "react";
import { NoAccess } from "@/components/desk/no-access";
import { PageHeader } from "@/components/desk/page-header";
import { CreateUserDialog } from "@/components/desk/users/create-user-dialog";
import { UserActions } from "@/components/desk/users/user-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/time";
import { PERMISSIONS, type Permission } from "@/server/auth/permissions";
import { can } from "@/server/auth/actor";
import { actorWith } from "@/server/auth/dal";
import { listRoles, listUsers } from "@/server/services/admin/users";

export const metadata: Metadata = { title: "Team & access" };

export default function UsersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Users />
    </Suspense>
  );
}

async function Users() {
  const actor = await actorWith("user:manage");
  if (!actor) return <NoAccess what="team management" />;
  const [users, roles] = await Promise.all([listUsers(actor), listRoles(actor)]);
  const canDelete = can(actor, "user:delete");
  // Only offer roles the current admin is allowed to grant (the service enforces this too).
  const grantable = roles.filter(
    (r) => (r.key !== "SUPER_ADMIN" || actor.roleKey === "SUPER_ADMIN") && r.permissions.every((p) => actor.permissions.has(p as Permission)),
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Team & access"
        description="Who can sign in, and what each role can see and do."
        actions={<CreateUserDialog roles={grantable} />}
      />

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[760px]">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last sign-in</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const manageable = u.id !== actor.userId && (u.roleKey !== "SUPER_ADMIN" || actor.roleKey === "SUPER_ADMIN");
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="font-medium">
                      {u.name}
                      {u.id === actor.userId ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    {u.phone ? <p className="text-xs text-muted-foreground">{u.phone}</p> : null}
                  </TableCell>
                  <TableCell className="text-sm">{u.roleName}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {u.status === "ACTIVE" ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 ring-1 ring-emerald-200 ring-inset">Active</span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 ring-1 ring-zinc-200 ring-inset">Disabled</span>
                      )}
                      {u.locked ? (
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-800 ring-1 ring-orange-200 ring-inset">Locked</span>
                      ) : null}
                      {u.mustChangePassword ? (
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-800 ring-1 ring-sky-200 ring-inset">Temporary password</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{u.activeSessions}</TableCell>
                  <TableCell>
                    {manageable ? <UserActions user={u} roles={grantable} canDelete={canDelete} /> : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <section aria-labelledby="roles-title" className="grid gap-3">
        <div>
          <h2 id="roles-title" className="font-medium">Roles</h2>
          <p className="text-sm text-muted-foreground">Permissions are checked on the server for every page and action.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((r) => (
            <div key={r.key} className="rounded-xl border bg-card p-4">
              <p className="font-medium">{r.name}</p>
              {r.description ? <p className="text-sm text-muted-foreground">{r.description}</p> : null}
              <ul className="mt-3 grid gap-1 text-xs text-muted-foreground">
                {r.permissions.map((p) => (
                  <li key={p}>· {PERMISSIONS[p as Permission] ?? p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
