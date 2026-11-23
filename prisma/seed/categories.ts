import type { PrismaClient } from "../../src/generated/prisma/client";

const u = (id: string) => `https://images.unsplash.com/photo-${id}`;

export const CATEGORIES = [
  { slug: "singers", name: "Singers", description: "Playback, Sufi, ghazal, pop and independent vocalists.", imageUrl: u("1493225457124-a3eb161ffa5f") },
  { slug: "djs", name: "DJs", description: "Club, Bollywood, house and techno DJs for every dance floor.", imageUrl: u("1496337589254-7e19d01cec44") },
  { slug: "live-bands", name: "Live bands", description: "Bollywood, rock, indie, jazz and fusion bands.", imageUrl: u("1521337581100-8ca9a73a5f79") },
  { slug: "instrumentalists", name: "Instrumentalists", description: "Saxophone, piano, violin, guitar and percussion.", imageUrl: u("1415201364774-f6f0bb35f28f") },
  { slug: "classical-performers", name: "Classical performers", description: "Hindustani and Carnatic vocalists and instrumentalists.", imageUrl: u("1465847899084-d164df4dedc6") },
  { slug: "dancers", name: "Dancers", description: "Contemporary, Bollywood, classical and choreographed troupes.", imageUrl: u("1503095396549-807759245b35") },
  { slug: "anchors-mcs", name: "Anchors & MCs", description: "Bilingual hosts for weddings, corporate nights and festivals.", imageUrl: u("1485579149621-3123dd979885") },
  { slug: "comedians", name: "Comedians", description: "Stand-up and improv acts for clean, crowd-friendly sets.", imageUrl: u("1516280440614-37939bbacd81") },
  { slug: "celebrity-performers", name: "Celebrity performers", description: "Headliners and well-known names, booked on request.", imageUrl: u("1522158637959-30385a09e0da") },
  { slug: "other-entertainers", name: "Other entertainers", description: "Magicians, acrobats, fire acts and more.", imageUrl: u("1508700115892-45ecd05ae2ad") },
] as const;

export async function seedCategories(prisma: PrismaClient) {
  for (const [i, c] of CATEGORIES.entries()) {
    await prisma.artistCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, imageUrl: c.imageUrl, sortOrder: i },
      create: { ...c, sortOrder: i },
    });
  }
  console.log(`  ✓ ${CATEGORIES.length} artist categories`);
}
