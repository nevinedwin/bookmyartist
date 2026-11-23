import { db } from "@/server/db";

/** Truncate all application tables between tests (test database only). */
export async function resetDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("test")) throw new Error("resetDatabase() may only run against a test database");
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export async function seedMinimalCatalogue() {
  const category = await db.artistCategory.create({ data: { slug: "singers", name: "Singers" } });
  const artist = await db.artist.create({
    data: {
      slug: "test-artist",
      stageName: "Test Artist",
      categoryId: category.id,
      shortBio: "Fictional test artist.",
      biography: "Fictional test artist.",
      baseCity: "Mumbai",
      languages: ["Hindi"],
      performanceTypes: ["Acoustic"],
      eventTypes: ["WEDDING"],
      internal: { create: { basePricePaise: 5_000_000n, contactEmail: "secret@example.invalid", internalNotes: "CONFIDENTIAL" } },
    },
  });
  await db.businessSettings.create({ data: { id: 1, agencyName: "BookMyArtist Test", enquiryNotifyEmails: ["ops@example.invalid"] } });
  const role = await db.role.create({
    data: {
      key: "STAFF",
      name: "Staff",
      permissions: { create: { permission: { create: { key: "enquiry:read", description: "View enquiries" } } } },
    },
  });
  await db.user.create({ data: { email: "staff@example.invalid", name: "Staff", passwordHash: "x", roleId: role.id } });
  return { category, artist };
}
