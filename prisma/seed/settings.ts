import type { PrismaClient } from "../../src/generated/prisma/client";

/** Create the settings singleton if missing. Never overwrites saved settings. */
export async function seedSettings(prisma: PrismaClient) {
  await prisma.businessSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      agencyName: "BookMyArtist",
      email: process.env.SEED_AGENCY_EMAIL ?? null,
      city: "Mumbai",
      state: "Maharashtra",
      country: "IN",
      enquiryNotifyEmails: process.env.SEED_AGENCY_EMAIL ? [process.env.SEED_AGENCY_EMAIL] : [],
      quotationTerms:
        "1. This quotation is valid until the date shown.\n2. Bookings are confirmed on receipt of the advance payment.\n3. Travel, stay and technical requirements are as per the artist rider unless stated otherwise.\n4. Cancellation terms are as per the booking agreement.",
      invoiceTerms: "Payment is due by the date shown. Please quote the invoice number with your payment.",
    },
  });
  console.log("  ✓ business settings");
}
