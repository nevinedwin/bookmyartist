import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { resetDatabase, seedMinimalCatalogue } from "../support/db";

/** The database exclusion constraint is the last line of defence against double-booking. */
describe("BookingArtist exclusion constraint", () => {
  let artistId: string;
  let clientId: string;

  beforeEach(async () => {
    await resetDatabase();
    ({ artist: { id: artistId } } = await seedMinimalCatalogue());
    clientId = (await db.client.create({ data: { name: "Client" } })).id;
  });
  afterAll(() => db.$disconnect());

  const book = async (ref: string, from: string, until: string, reservationStatus: "TENTATIVE" | "CONFIRMED") => {
    const booking = await db.booking.create({
      data: { reference: ref, clientId, title: ref, eventType: "WEDDING", eventDate: new Date("2027-02-14"), city: "Udaipur" },
    });
    return db.bookingArtist.create({
      data: {
        bookingId: booking.id,
        artistId,
        performanceStartsAt: new Date(from),
        performanceEndsAt: new Date(until),
        blockedFrom: new Date(from),
        blockedUntil: new Date(until),
        reservationStatus,
      },
    });
  };

  it("rejects two overlapping CONFIRMED reservations for the same artist", async () => {
    await book("BKG-1", "2027-02-14T14:00:00Z", "2027-02-14T17:00:00Z", "CONFIRMED");
    await expect(book("BKG-2", "2027-02-14T16:00:00Z", "2027-02-14T19:00:00Z", "CONFIRMED")).rejects.toThrow();
  });

  it("allows back-to-back windows and tentative overlaps", async () => {
    await book("BKG-1", "2027-02-14T14:00:00Z", "2027-02-14T17:00:00Z", "CONFIRMED");
    await expect(book("BKG-2", "2027-02-14T17:00:00Z", "2027-02-14T19:00:00Z", "CONFIRMED")).resolves.toBeTruthy();
    await expect(book("BKG-3", "2027-02-14T15:00:00Z", "2027-02-14T16:00:00Z", "TENTATIVE")).resolves.toBeTruthy();
  });

  it("rejects inverted performance windows", async () => {
    await expect(book("BKG-4", "2027-02-14T17:00:00Z", "2027-02-14T14:00:00Z", "TENTATIVE")).rejects.toThrow();
  });
});
