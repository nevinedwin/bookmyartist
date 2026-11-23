/**
 * Idempotent seed. Safe to run repeatedly.
 *
 *   npm run db:seed                  roles, permissions, settings, categories
 *   SEED_DEMO=true npm run db:seed   + fictional demo artists & testimonials
 *
 * Demo content is refused when NODE_ENV=production.
 */
import { prisma } from "./client";
import { seedCategories } from "./categories";
import { seedDemoContent } from "./demo";
import { seedRoles } from "./roles";
import { seedSettings } from "./settings";

async function main() {
  console.log("Seeding…");
  await seedRoles(prisma);
  await seedSettings(prisma);
  await seedCategories(prisma);

  if (process.env.SEED_DEMO === "true") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Refusing to seed demo content with NODE_ENV=production.");
    }
    await seedDemoContent(prisma);
  }
  console.log("Done.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
