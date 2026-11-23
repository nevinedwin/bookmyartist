import type { PrismaClient } from "../../src/generated/prisma/client";
import { PERMISSIONS, SYSTEM_ROLES } from "../../src/server/auth/permissions";

/** Idempotently sync the permission catalogue and system role grants. */
export async function seedRoles(prisma: PrismaClient) {
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({ where: { key }, update: { description }, create: { key, description } });
  }
  const permissions = await prisma.permission.findMany();
  const idByKey = new Map(permissions.map((p) => [p.key, p.id]));

  for (const [key, role] of Object.entries(SYSTEM_ROLES)) {
    const saved = await prisma.role.upsert({
      where: { key },
      update: { name: role.name, description: role.description, isSystem: true },
      create: { key, name: role.name, description: role.description, isSystem: true },
    });
    const wanted = role.permissions.map((p) => idByKey.get(p)).filter((id): id is string => Boolean(id));
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: saved.id, permissionId: { notIn: wanted } } }),
      prisma.rolePermission.createMany({
        data: wanted.map((permissionId) => ({ roleId: saved.id, permissionId })),
        skipDuplicates: true,
      }),
    ]);
  }
  console.log(`  ✓ ${Object.keys(PERMISSIONS).length} permissions, ${Object.keys(SYSTEM_ROLES).length} roles`);
}
