import type { EventType } from "@/generated/prisma/enums";
import { IMAGES } from "./images";

/**
 * Curated experiences: ready-made entertainment formats customers can start
 * from. Enquiring about one pre-fills the booking wizard.
 */
export interface Experience {
  slug: string;
  name: string;
  mood: string;
  description: string;
  eventTypes: EventType[];
  lineup: string[];
  duration: string;
  image: string;
  categorySlug: string;
}

export const EXPERIENCES: Experience[] = [
  {
    slug: "sangeet-night-live",
    name: "Sangeet Night Live",
    mood: "Celebratory · High energy",
    description:
      "A live band trading Bollywood classics and Punjabi anthems with a choreographed family performance segment and an emcee holding it all together.",
    eventTypes: ["WEDDING"],
    lineup: ["6-piece live band", "Emcee", "Choreographed dance troupe"],
    duration: "3 – 4 hours",
    image: IMAGES.danceFloor,
    categorySlug: "live-bands",
  },
  {
    slug: "sufi-under-the-stars",
    name: "Sufi Under the Stars",
    mood: "Soulful · Intimate",
    description:
      "Qawwali and Sufi poetry set to harmonium, tabla and hand claps — an open-air evening that slows time down.",
    eventTypes: ["WEDDING", "PRIVATE_PARTY", "CULTURAL"],
    lineup: ["Lead vocalist", "Harmonium", "Tabla", "Chorus"],
    duration: "90 minutes",
    image: IMAGES.heroCrowdGold,
    categorySlug: "singers",
  },
  {
    slug: "after-dark-club-set",
    name: "After Dark Club Set",
    mood: "Electronic · Late night",
    description:
      "A headline DJ with live percussion and a lighting design that turns any lawn or ballroom into a club.",
    eventTypes: ["PRIVATE_PARTY", "WEDDING", "COLLEGE_FESTIVAL"],
    lineup: ["Headline DJ", "Live percussionist", "LED & lighting design"],
    duration: "2 – 4 hours",
    image: IMAGES.djCrowd,
    categorySlug: "djs",
  },
  {
    slug: "the-gala-evening",
    name: "The Gala Evening",
    mood: "Polished · Elegant",
    description:
      "A jazz quartet for the cocktail hour, a bilingual emcee for the awards and a crowd-pleasing headliner to close the night.",
    eventTypes: ["CORPORATE"],
    lineup: ["Jazz quartet", "Bilingual emcee", "Headline act"],
    duration: "4 hours",
    image: IMAGES.saxophone,
    categorySlug: "instrumentalists",
  },
  {
    slug: "campus-pro-night",
    name: "Campus Pro-Night",
    mood: "Loud · Euphoric",
    description:
      "An opening DJ, a rising indie band and a headliner — sequenced to build all evening long.",
    eventTypes: ["COLLEGE_FESTIVAL", "FESTIVAL"],
    lineup: ["Opening DJ", "Indie band", "Headliner"],
    duration: "5 hours",
    image: IMAGES.confettiStage,
    categorySlug: "live-bands",
  },
  {
    slug: "raag-and-rhythm",
    name: "Raag & Rhythm",
    mood: "Classical · Contemplative",
    description:
      "A Hindustani recital paired with a Kathak performance — heritage art forms presented with the staging they deserve.",
    eventTypes: ["CULTURAL", "CORPORATE"],
    lineup: ["Classical vocalist", "Tabla & sarangi", "Kathak dancer"],
    duration: "2 hours",
    image: IMAGES.violinists,
    categorySlug: "classical-performers",
  },
];
