import type { EventType } from "@/generated/prisma/enums";
import { IMAGES } from "./images";

export interface ServiceContent {
  slug: string;
  eventType: EventType;
  name: string;
  /** Short line used on cards. */
  kicker: string;
  headline: string;
  intro: string;
  body: string[];
  highlights: { title: string; text: string }[];
  /** Category slugs we typically recommend for this event type. */
  recommendedCategories: string[];
  heroImage: string;
  gallery: string[];
  faqs: { q: string; a: string }[];
}

export const SERVICES: ServiceContent[] = [
  {
    slug: "weddings",
    eventType: "WEDDING",
    name: "Weddings",
    kicker: "Sangeet to reception",
    headline: "A soundtrack for every ritual of the celebration.",
    intro:
      "From a soft sitar at the haldi to a headline act at the reception, we build a musical arc across every function of your wedding.",
    body: [
      "Indian weddings are multi-day productions with very different moods. We plan the entertainment as one story — intimate acoustic sets for the mehendi, high-energy performers and choreographed dance for the sangeet, a live band for the baraat, and a polished headliner or DJ for the reception.",
      "We coordinate directly with your planner and venue on stage size, sound, power, green rooms and timing, so the families can simply enjoy the moment.",
    ],
    highlights: [
      { title: "Function-by-function planning", text: "A tailored line-up for mehendi, sangeet, baraat, ceremony and reception." },
      { title: "Destination ready", text: "Travel, stay and technical riders handled for Udaipur, Goa, Jaipur and beyond." },
      { title: "Family-friendly curation", text: "Set lists approved in advance, with song requests built in." },
    ],
    recommendedCategories: ["singers", "live-bands", "djs", "dancers", "anchors-mcs"],
    heroImage: IMAGES.weddingBride,
    gallery: [IMAGES.weddingTable, IMAGES.danceFloor, IMAGES.cheers],
    faqs: [
      { q: "How early should we book?", a: "For peak wedding season (November–February) we recommend 3–6 months ahead for popular artists." },
      { q: "Can artists perform across multiple days?", a: "Yes. We quote multi-function packages and handle travel and stay between functions." },
    ],
  },
  {
    slug: "corporate-events",
    eventType: "CORPORATE",
    name: "Corporate events",
    kicker: "Galas, offsites & awards",
    headline: "Entertainment that makes the brand look good on stage.",
    intro:
      "Annual days, award nights, dealer meets and offsites — curated performers, a professional emcee and run-of-show discipline.",
    body: [
      "Corporate audiences are diverse and time-boxed. We pick acts that land with a mixed audience, keep content brand-safe, and work to a tight run-of-show alongside your event agency.",
      "Invoices, purchase orders and vendor onboarding are handled by our team so your procurement process stays simple.",
    ],
    highlights: [
      { title: "Brand-safe content", text: "Scripts and set lists reviewed against your guidelines." },
      { title: "Professional emcees", text: "Bilingual hosts who keep award nights crisp and on time." },
      { title: "Procurement friendly", text: "Formal quotations, invoices and documentation." },
    ],
    recommendedCategories: ["anchors-mcs", "live-bands", "comedians", "instrumentalists"],
    heroImage: IMAGES.conference,
    gallery: [IMAGES.stageRig, IMAGES.saxophone, IMAGES.heroLightBeams],
    faqs: [
      { q: "Do you provide sound and lights?", a: "We coordinate technical riders with your production partner, or can recommend one." },
      { q: "Can you work with a PO process?", a: "Yes — we issue formal quotations and invoices against purchase orders." },
    ],
  },
  {
    slug: "college-festivals",
    eventType: "COLLEGE_FESTIVAL",
    name: "College festivals",
    kicker: "Pro-nights & cultfests",
    headline: "Headliners that fill the grounds on pro-night.",
    intro:
      "We help student committees book headliners, DJs and stand-up acts within budget — with transparent paperwork for the college.",
    body: [
      "Fest budgets are tight and timelines are tighter. We shortlist artists by footfall, genre and budget, and walk student teams through riders, security and stage requirements.",
      "Every commitment is documented so faculty coordinators have a clear paper trail.",
    ],
    highlights: [
      { title: "Budget-led shortlists", text: "Options at every budget, from emerging acts to big names." },
      { title: "Rider guidance", text: "Clear technical and hospitality checklists for student teams." },
      { title: "Crowd-tested acts", text: "Performers who know how to work a 5,000-strong crowd." },
    ],
    recommendedCategories: ["djs", "live-bands", "singers", "comedians"],
    heroImage: IMAGES.confettiCrowd,
    gallery: [IMAGES.djCrowd, IMAGES.crowdHearts, IMAGES.bandDark],
    faqs: [
      { q: "Can we pay in instalments?", a: "Typically an advance confirms the date and the balance is due before the performance." },
    ],
  },
  {
    slug: "private-parties",
    eventType: "PRIVATE_PARTY",
    name: "Private parties",
    kicker: "Birthdays, anniversaries & soirées",
    headline: "Intimate evenings with world-class sound.",
    intro:
      "Acoustic duos for a rooftop dinner, a jazz trio for an anniversary, or a DJ who turns the living room into a club.",
    body: [
      "Private events are about the guests. We match the artist to your crowd and the space — volume, set length and song choices all planned with you.",
    ],
    highlights: [
      { title: "Right-sized acts", text: "Solo, duo and trio formats that suit homes and small venues." },
      { title: "Personal set lists", text: "Your favourite songs, woven into the performance." },
      { title: "Discreet & punctual", text: "Professional artists who respect your home and guests." },
    ],
    recommendedCategories: ["singers", "instrumentalists", "djs"],
    heroImage: IMAGES.cheers,
    gallery: [IMAGES.vintageMic, IMAGES.saxophone, IMAGES.clubParty],
    faqs: [
      { q: "Is there a minimum audience size?", a: "No. Many of our artists perform for gatherings of 20–50 guests." },
    ],
  },
  {
    slug: "concerts",
    eventType: "CONCERT",
    name: "Concerts",
    kicker: "Ticketed & touring shows",
    headline: "Full-scale concerts, produced with promoters.",
    intro:
      "We work with promoters and venues on ticketed shows — artist booking, riders, scheduling and settlement.",
    body: [
      "For ticketed shows we manage the artist side end to end: offers, riders, travel, show-day schedules and payout settlement, so promoters can focus on selling the room.",
    ],
    highlights: [
      { title: "Promoter partnerships", text: "Clear offers, guarantees and settlement terms." },
      { title: "Tour routing", text: "Multi-city scheduling that respects travel and rest days." },
      { title: "Show-day control", text: "Advance sheets, sound-check slots and stage times." },
    ],
    recommendedCategories: ["singers", "live-bands", "celebrity-performers"],
    heroImage: IMAGES.heroLightBeams,
    gallery: [IMAGES.heroCrowdGold, IMAGES.stageRigBlue, IMAGES.bandStage],
    faqs: [],
  },
  {
    slug: "cultural-programs",
    eventType: "CULTURAL",
    name: "Cultural programmes",
    kicker: "Classical, folk & devotional",
    headline: "Heritage art forms, presented with care.",
    intro:
      "Hindustani and Carnatic recitals, folk ensembles, qawwali and devotional evenings for institutions, temples and cultural bodies.",
    body: [
      "Classical and folk performances need the right acoustics, seating and accompanists. We handle the details that let these art forms shine.",
    ],
    highlights: [
      { title: "Authentic artists", text: "Trained performers and their accompanists." },
      { title: "Acoustic planning", text: "Stage and sound guidance for unamplified instruments." },
      { title: "Institutional paperwork", text: "Documentation for trusts, temples and government bodies." },
    ],
    recommendedCategories: ["classical-performers", "instrumentalists", "dancers"],
    heroImage: IMAGES.theatreStage,
    gallery: [IMAGES.violinists, IMAGES.danceTroupe, IMAGES.sheetMusic],
    faqs: [],
  },
  {
    slug: "festivals",
    eventType: "FESTIVAL",
    name: "Festivals",
    kicker: "Multi-stage line-ups",
    headline: "Line-ups curated stage by stage.",
    intro:
      "Music, food and city festivals — we curate multi-artist line-ups and manage the schedule across stages.",
    body: [
      "Festivals live or die on flow. We build line-ups that rise through the day, manage changeovers and keep every artist on time.",
    ],
    highlights: [
      { title: "Line-up curation", text: "Genre arcs that build to the headline slot." },
      { title: "Multi-artist logistics", text: "Travel, stay and stage schedules for every act." },
      { title: "Settlement", text: "Clear payouts and paperwork after the festival." },
    ],
    recommendedCategories: ["djs", "live-bands", "singers", "celebrity-performers"],
    heroImage: IMAGES.colourFestival,
    gallery: [IMAGES.heroFestivalViolet, IMAGES.confettiStage, IMAGES.crowdHands],
    faqs: [],
  },
  {
    slug: "brand-activations",
    eventType: "BRAND_ACTIVATION",
    name: "Brand activations",
    kicker: "Launches & experiential",
    headline: "Performances that put the product in the spotlight.",
    intro:
      "Product launches, mall activations and experiential campaigns with performers who can work with a brief.",
    body: [
      "Activations need artists who understand a brief, integrate brand moments and create shareable content. We pair them with your agency's creative.",
    ],
    highlights: [
      { title: "Brief-led performances", text: "Custom intros, product reveals and branded moments." },
      { title: "Content-ready", text: "Artists comfortable with cameras, creators and live streams." },
      { title: "Usage rights", text: "Clear terms for recording and social usage." },
    ],
    recommendedCategories: ["djs", "dancers", "anchors-mcs", "instrumentalists"],
    heroImage: IMAGES.stageRigBlue,
    gallery: [IMAGES.dancerSolo, IMAGES.neonSign, IMAGES.djCrowd],
    faqs: [],
  },
];

export function getService(slug: string): ServiceContent | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export function getServiceByEventType(eventType: EventType): ServiceContent | undefined {
  return SERVICES.find((s) => s.eventType === eventType);
}
