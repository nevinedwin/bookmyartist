/**
 * DEMO CONTENT — development and preview environments only.
 *
 * All artists below are fictional. Names, biographies and prices are invented
 * for UI development. Photography is from Unsplash (Unsplash License) and does
 * not depict the named artists. Every record is flagged `isDemo = true` and
 * can be removed with `removeDemoContent()`.
 */
import type { PrismaClient } from "../../src/generated/prisma/client";
import type { EventType } from "../../src/generated/prisma/enums";

const u = (id: string) => `https://images.unsplash.com/photo-${id}`;
const L = (lakh: number) => BigInt(Math.round(lakh * 100_000)) * 100n; // lakh rupees → paise

interface DemoArtist {
  slug: string;
  stageName: string;
  category: string;
  tagline: string;
  shortBio: string;
  biography: string;
  performanceDescription: string;
  profile: string;
  cover: string;
  gallery: string[];
  languages: string[];
  baseCity: string;
  performanceTypes: string[];
  eventTypes: EventType[];
  technicalRequirements: string;
  teamSize: number;
  minDuration: number;
  maxDuration: number;
  featured?: number;
  publicPriceLakh?: number;
  basePriceLakh: number;
  commissionBps: number;
  availabilityVerified?: boolean;
}

const ARTISTS: DemoArtist[] = [
  {
    slug: "aanya-rao",
    stageName: "Aanya Rao",
    category: "singers",
    tagline: "Bollywood, Sufi & unplugged",
    shortBio: "A warm, versatile voice moving from Sufi classics to chart-topping Bollywood in a single set.",
    biography:
      "Aanya trained in Hindustani classical music for twelve years before finding her sound at the crossroads of Sufi, retro Bollywood and acoustic pop. She has headlined more than 300 weddings and private evenings across India and the Gulf, and is known for reading a room and shaping the set around it.\n\nHer performances move from intimate unplugged sets with guitar and cajón to full-band showcases with dancers.",
    performanceDescription:
      "Choose between an acoustic trio (vocals, guitar, cajón) or a 7-piece band with keys, bass, drums, percussion and backing vocals.",
    profile: u("1528489496900-d841974f5290"),
    cover: u("1493225457124-a3eb161ffa5f"),
    gallery: [u("1528489496900-d841974f5290"), u("1493225457124-a3eb161ffa5f"), u("1511671782779-c97d3d27a1d4"), u("1429962714451-bb934ecdc4ec")],
    languages: ["Hindi", "Urdu", "English", "Punjabi"],
    baseCity: "Mumbai",
    performanceTypes: ["Acoustic trio", "Full band", "Sufi night"],
    eventTypes: ["WEDDING", "PRIVATE_PARTY", "CORPORATE", "CONCERT"],
    technicalRequirements: "Stage 16×12 ft minimum for full band, 4 monitor wedges, 2 vocal mics (SM58 or better), green room.",
    teamSize: 7,
    minDuration: 60,
    maxDuration: 150,
    featured: 1,
    publicPriceLakh: 2.5,
    basePriceLakh: 2,
    commissionBps: 2000,
    availabilityVerified: true,
  },
  {
    slug: "dj-nightshift",
    stageName: "DJ Nightshift",
    category: "djs",
    tagline: "Bollywood house & open-format",
    shortBio: "Open-format sets that blend Bollywood, house and hip-hop — built for packed dance floors.",
    biography:
      "Nightshift cut his teeth in Goa's beach clubs before becoming a fixture on the wedding and corporate circuit. His sets are mixed live and read the crowd in real time — from cocktail-hour lounge to 2 a.m. peak.\n\nHe travels with his own controller setup and can add a live percussionist and LED visuals.",
    performanceDescription: "Solo DJ set, optional live dhol/percussion and LED visual package.",
    profile: u("1468164016595-6108e4c60c8b"),
    cover: u("1496337589254-7e19d01cec44"),
    gallery: [u("1496337589254-7e19d01cec44"), u("1574391884720-bbc3740c59d1"), u("1468164016595-6108e4c60c8b"), u("1545128485-c400e7702796")],
    languages: ["English", "Hindi"],
    baseCity: "Goa",
    performanceTypes: ["Open-format DJ set", "Bollywood night", "Sundowner lounge"],
    eventTypes: ["WEDDING", "PRIVATE_PARTY", "COLLEGE_FESTIVAL", "FESTIVAL", "BRAND_ACTIVATION"],
    technicalRequirements: "Pioneer CDJ-3000 ×2 + DJM-900NXS2 (or equivalent), 2 booth monitors, 6×4 ft riser.",
    teamSize: 1,
    minDuration: 120,
    maxDuration: 300,
    featured: 2,
    publicPriceLakh: 1.2,
    basePriceLakh: 0.9,
    commissionBps: 2500,
  },
  {
    slug: "the-monsoon-collective",
    stageName: "The Monsoon Collective",
    category: "live-bands",
    tagline: "Indie-folk fusion from Bengaluru",
    shortBio: "Eight musicians, one sound: folk melodies, indie hooks and a rhythm section built for festivals.",
    biography:
      "The Monsoon Collective formed in a Bengaluru basement and grew into one of the most-requested festival bands in the south. Their set weaves Kannada and Hindi folk melodies into indie rock, with violin, flute and a two-drummer engine room.\n\nThey are as comfortable on a 10,000-capacity festival stage as at a sundowner wedding.",
    performanceDescription: "Full 8-piece set (75–90 min) or stripped-back 4-piece acoustic set.",
    profile: u("1521337581100-8ca9a73a5f79"),
    cover: u("1501612780327-45045538702b"),
    gallery: [u("1521337581100-8ca9a73a5f79"), u("1526478806334-5fd488fcaabc"), u("1501612780327-45045538702b"), u("1506157786151-b8491531f063")],
    languages: ["Kannada", "Hindi", "English"],
    baseCity: "Bengaluru",
    performanceTypes: ["Festival set", "Acoustic set"],
    eventTypes: ["FESTIVAL", "COLLEGE_FESTIVAL", "CONCERT", "WEDDING"],
    technicalRequirements: "Full backline rider; 24 × 20 ft stage; 32-channel FOH; 6 monitor mixes.",
    teamSize: 8,
    minDuration: 60,
    maxDuration: 90,
    featured: 3,
    basePriceLakh: 3.5,
    commissionBps: 1500,
  },
  {
    slug: "raghav-and-the-rewind",
    stageName: "Raghav & The Rewind",
    category: "live-bands",
    tagline: "Classic rock, retro Bollywood",
    shortBio: "A five-piece that rewinds through 60 years of anthems — from Kishore to Queen.",
    biography:
      "Fronted by guitarist-vocalist Raghav, The Rewind are the band corporate planners call when the audience spans three generations. Expect R.D. Burman grooves, 80s stadium rock and singalong medleys that bring everyone to the floor.",
    performanceDescription: "Two 45-minute sets or one 90-minute set with medleys tailored to the audience.",
    profile: u("1598387993441-a364f854c3e1"),
    cover: u("1499364615650-ec38552f4f34"),
    gallery: [u("1598387993441-a364f854c3e1"), u("1460723237483-7a6dc9d0b212"), u("1499364615650-ec38552f4f34")],
    languages: ["Hindi", "English"],
    baseCity: "New Delhi",
    performanceTypes: ["Corporate set", "Retro night"],
    eventTypes: ["CORPORATE", "PRIVATE_PARTY", "WEDDING", "COLLEGE_FESTIVAL"],
    technicalRequirements: "Standard 5-piece backline, 20 × 16 ft stage, 4 monitor mixes.",
    teamSize: 5,
    minDuration: 90,
    maxDuration: 120,
    featured: 5,
    publicPriceLakh: 1.8,
    basePriceLakh: 1.4,
    commissionBps: 2000,
    availabilityVerified: true,
  },
  {
    slug: "ishaan-varma",
    stageName: "Ishaan Varma",
    category: "singers",
    tagline: "Singer-songwriter · acoustic",
    shortBio: "Honest songs, a well-loved guitar and covers reimagined for candle-lit evenings.",
    biography:
      "Ishaan is a Pune-based songwriter whose originals have found a following online. Live, he mixes his own songs with stripped-back versions of Hindi and English favourites — perfect for dinners, proposals and rooftop parties.",
    performanceDescription: "Solo acoustic (vocals + guitar) or duo with keys.",
    profile: u("1460723237483-7a6dc9d0b212"),
    cover: u("1510915361894-db8b60106cb1"),
    gallery: [u("1510915361894-db8b60106cb1"), u("1460723237483-7a6dc9d0b212"), u("1511671782779-c97d3d27a1d4")],
    languages: ["Hindi", "English", "Marathi"],
    baseCity: "Pune",
    performanceTypes: ["Solo acoustic", "Acoustic duo"],
    eventTypes: ["PRIVATE_PARTY", "WEDDING", "CORPORATE"],
    technicalRequirements: "One vocal mic, one DI, small PA for up to 100 guests (can bring own).",
    teamSize: 1,
    minDuration: 45,
    maxDuration: 120,
    publicPriceLakh: 0.4,
    basePriceLakh: 0.3,
    commissionBps: 2500,
    availabilityVerified: true,
  },
  {
    slug: "meera-iyer-trio",
    stageName: "Meera Iyer Trio",
    category: "classical-performers",
    tagline: "Carnatic violin · mridangam · ghatam",
    shortBio: "Carnatic violin recitals that are rigorous, luminous and surprisingly playful.",
    biography:
      "Meera leads a trio rooted in the Carnatic tradition, with mridangam and ghatam accompaniment. Her concerts move from classical kritis to film-song improvisations that delight younger audiences.",
    performanceDescription: "Concert format (90–120 min) or a 45-minute curated showcase for events.",
    profile: u("1465847899084-d164df4dedc6"),
    cover: u("1507838153414-b4b713384a76"),
    gallery: [u("1465847899084-d164df4dedc6"), u("1507838153414-b4b713384a76"), u("1585699324551-f6c309eedeca")],
    languages: ["Tamil", "English"],
    baseCity: "Chennai",
    performanceTypes: ["Classical concert", "Showcase"],
    eventTypes: ["CULTURAL", "WEDDING", "CORPORATE"],
    technicalRequirements: "Low platform with carpet, 3 condenser mics, quiet acoustic environment.",
    teamSize: 3,
    minDuration: 45,
    maxDuration: 120,
    featured: 6,
    basePriceLakh: 1,
    commissionBps: 1500,
  },
  {
    slug: "kavya-dance-company",
    stageName: "Kavya Dance Company",
    category: "dancers",
    tagline: "Bollywood & contemporary troupe",
    shortBio: "A 12-member troupe for show-stopping sangeet openers, product reveals and stage spectacles.",
    biography:
      "Kavya Dance Company creates choreographed acts for weddings, awards nights and launches. They also choreograph family performances for sangeets, with rehearsals in person or online.",
    performanceDescription: "Choreographed acts of 8–20 minutes; family choreography packages available.",
    profile: u("1503095396549-807759245b35"),
    cover: u("1503095396549-807759245b35"),
    gallery: [u("1503095396549-807759245b35"), u("1535525153412-5a42439a210d"), u("1547153760-18fc86324498")],
    languages: ["Hindi", "Telugu", "English"],
    baseCity: "Hyderabad",
    performanceTypes: ["Stage act", "Sangeet choreography"],
    eventTypes: ["WEDDING", "CORPORATE", "BRAND_ACTIVATION", "CULTURAL"],
    technicalRequirements: "Clear stage 24 × 16 ft with non-slip surface, changing room for 12.",
    teamSize: 12,
    minDuration: 10,
    maxDuration: 30,
    featured: 4,
    publicPriceLakh: 1.5,
    basePriceLakh: 1.1,
    commissionBps: 2000,
  },
  {
    slug: "zara-kapoor",
    stageName: "Zara Kapoor",
    category: "dancers",
    tagline: "Contemporary soloist",
    shortBio: "Fluid, cinematic contemporary dance for launches, galas and music videos.",
    biography:
      "Zara blends contemporary, jazz and Indian classical vocabulary into solo pieces that feel made for the camera. She often collaborates with brands on launch moments.",
    performanceDescription: "Solo pieces of 4–8 minutes; custom choreography to brief.",
    profile: u("1547153760-18fc86324498"),
    cover: u("1535525153412-5a42439a210d"),
    gallery: [u("1547153760-18fc86324498"), u("1535525153412-5a42439a210d")],
    languages: ["Hindi", "English"],
    baseCity: "Mumbai",
    performanceTypes: ["Solo act", "Brand choreography"],
    eventTypes: ["BRAND_ACTIVATION", "CORPORATE", "CONCERT"],
    technicalRequirements: "Sprung or non-slip floor, minimum 12 × 12 ft, playback system.",
    teamSize: 1,
    minDuration: 5,
    maxDuration: 20,
    basePriceLakh: 0.5,
    commissionBps: 2000,
  },
  {
    slug: "rohan-sethi",
    stageName: "Rohan Sethi",
    category: "anchors-mcs",
    tagline: "Bilingual host · weddings & corporate",
    shortBio: "Quick-witted, warm and always on time — the host who keeps the show moving.",
    biography:
      "Rohan has hosted more than 800 events, from 50-guest anniversaries to 5,000-seat award shows. He scripts with you in advance, works seamlessly with show callers and has a knack for getting reluctant guests on the dance floor.",
    performanceDescription: "Full-event hosting with games, introductions and award segments.",
    profile: u("1485579149621-3123dd979885"),
    cover: u("1540575467063-178a50c2df87"),
    gallery: [u("1485579149621-3123dd979885"), u("1540575467063-178a50c2df87")],
    languages: ["Hindi", "English", "Punjabi"],
    baseCity: "New Delhi",
    performanceTypes: ["Wedding host", "Corporate emcee", "Awards host"],
    eventTypes: ["WEDDING", "CORPORATE", "COLLEGE_FESTIVAL", "BRAND_ACTIVATION"],
    technicalRequirements: "Two cordless handheld mics, confidence monitor for scripted segments.",
    teamSize: 1,
    minDuration: 120,
    maxDuration: 360,
    publicPriceLakh: 0.6,
    basePriceLakh: 0.45,
    commissionBps: 2000,
    availabilityVerified: true,
  },
  {
    slug: "tanvi-bhatt",
    stageName: "Tanvi Bhatt",
    category: "comedians",
    tagline: "Clean stand-up for mixed audiences",
    shortBio: "Observational comedy about offices, families and Indian weddings — clean, sharp and relatable.",
    biography:
      "Tanvi's specials have toured 40 cities. Her corporate-friendly sets are tailored with company in-jokes gathered beforehand, without punching down.",
    performanceDescription: "30–60 minute stand-up set; can be customised with company or family references.",
    profile: u("1516280440614-37939bbacd81"),
    cover: u("1585699324551-f6c309eedeca"),
    gallery: [u("1516280440614-37939bbacd81"), u("1585699324551-f6c309eedeca")],
    languages: ["English", "Hindi", "Gujarati"],
    baseCity: "Bengaluru",
    performanceTypes: ["Stand-up set", "Corporate roast"],
    eventTypes: ["CORPORATE", "COLLEGE_FESTIVAL", "PRIVATE_PARTY"],
    technicalRequirements: "One handheld mic on a stand, spotlight, seated audience preferred.",
    teamSize: 1,
    minDuration: 30,
    maxDuration: 60,
    basePriceLakh: 1.2,
    commissionBps: 2000,
  },
  {
    slug: "neil-dsouza-sax",
    stageName: "Neil D'Souza",
    category: "instrumentalists",
    tagline: "Saxophone · lounge & live-to-DJ",
    shortBio: "Smooth sax for cocktail hours, or live over a DJ set when the night takes off.",
    biography:
      "Goa-born saxophonist Neil plays jazz standards, Bollywood melodies and house riffs. He's a favourite for cocktail receptions and pairs brilliantly with DJs for a live element.",
    performanceDescription: "Solo with backing tracks, duo with keys, or live-with-DJ format.",
    profile: u("1415201364774-f6f0bb35f28f"),
    cover: u("1415201364774-f6f0bb35f28f"),
    gallery: [u("1415201364774-f6f0bb35f28f"), u("1574391884720-bbc3740c59d1")],
    languages: ["English", "Konkani", "Hindi"],
    baseCity: "Goa",
    performanceTypes: ["Cocktail sax", "Live with DJ"],
    eventTypes: ["WEDDING", "CORPORATE", "PRIVATE_PARTY"],
    technicalRequirements: "Clip-on instrument mic (provided), playback channel, small riser.",
    teamSize: 1,
    minDuration: 60,
    maxDuration: 180,
    publicPriceLakh: 0.5,
    basePriceLakh: 0.35,
    commissionBps: 2500,
  },
  {
    slug: "keys-by-aditi",
    stageName: "Keys by Aditi",
    category: "instrumentalists",
    tagline: "Grand piano · cinematic covers",
    shortBio: "Film scores, Bollywood ballads and classical pieces on grand piano.",
    biography:
      "Aditi is a conservatory-trained pianist who reimagines film scores and Bollywood ballads. Her sets are a favourite for ceremonies, gala dinners and luxury retail launches.",
    performanceDescription: "Solo piano sets; string quartet add-on available.",
    profile: u("1520523839897-bd0b52f945a0"),
    cover: u("1520523839897-bd0b52f945a0"),
    gallery: [u("1520523839897-bd0b52f945a0"), u("1507838153414-b4b713384a76")],
    languages: ["English", "Hindi"],
    baseCity: "New Delhi",
    performanceTypes: ["Solo piano", "Piano & strings"],
    eventTypes: ["WEDDING", "CORPORATE", "BRAND_ACTIVATION"],
    technicalRequirements: "Tuned grand or digital stage piano (Nord/Yamaha CP), 2 DI, stool.",
    teamSize: 1,
    minDuration: 45,
    maxDuration: 150,
    basePriceLakh: 0.45,
    commissionBps: 2000,
  },
  {
    slug: "luna-electric",
    stageName: "Luna Electric",
    category: "djs",
    tagline: "Melodic techno duo",
    shortBio: "A DJ duo known for sunset-to-sunrise melodic techno journeys.",
    biography:
      "Luna Electric are a Bengaluru duo playing melodic techno and progressive house, with a live synth element. Regulars on the festival circuit, they also play premium after-parties.",
    performanceDescription: "B2B DJ set with live synth; 2–4 hours.",
    profile: u("1574391884720-bbc3740c59d1"),
    cover: u("1514525253161-7a46d19cd819"),
    gallery: [u("1574391884720-bbc3740c59d1"), u("1514525253161-7a46d19cd819"), u("1545128485-c400e7702796")],
    languages: ["English"],
    baseCity: "Bengaluru",
    performanceTypes: ["Festival set", "After-party"],
    eventTypes: ["FESTIVAL", "PRIVATE_PARTY", "BRAND_ACTIVATION", "COLLEGE_FESTIVAL"],
    technicalRequirements: "CDJ-3000 ×3, DJM-V10, 2 booth monitors, space for a synth stand.",
    teamSize: 2,
    minDuration: 120,
    maxDuration: 240,
    featured: 7,
    basePriceLakh: 1.6,
    commissionBps: 2000,
  },
  {
    slug: "rhythm-house-ensemble",
    stageName: "Rhythm House Ensemble",
    category: "instrumentalists",
    tagline: "Dhol, drums & percussion spectacle",
    shortBio: "A thundering percussion ensemble for baraats, openings and stadium moments.",
    biography:
      "Rhythm House brings together Rajasthani folk percussion, Punjabi dhol and a modern drum kit into a choreographed spectacle. They lead baraats and open shows with unforgettable energy.",
    performanceDescription: "Walking baraat format or 15-minute stage spectacle.",
    profile: u("1514320291840-2e0a9bf2a9ae"),
    cover: u("1533174072545-7a4b6ad7a6c3"),
    gallery: [u("1514320291840-2e0a9bf2a9ae"), u("1533174072545-7a4b6ad7a6c3")],
    languages: ["Hindi", "Rajasthani"],
    baseCity: "Jaipur",
    performanceTypes: ["Baraat", "Stage opener"],
    eventTypes: ["WEDDING", "FESTIVAL", "CORPORATE", "BRAND_ACTIVATION"],
    technicalRequirements: "Clear procession route or 20 × 12 ft stage; no amplification needed for baraat.",
    teamSize: 10,
    minDuration: 15,
    maxDuration: 90,
    basePriceLakh: 0.8,
    commissionBps: 2000,
  },
  {
    slug: "velvet-hour",
    stageName: "Velvet Hour",
    category: "live-bands",
    tagline: "Jazz & soul quartet",
    shortBio: "Swing, soul and jazz-reworked Bollywood for elegant evenings.",
    biography:
      "Velvet Hour is a Mumbai quartet — vocals, keys, upright bass and drums — that turns cocktail hours into supper-club evenings. Their jazz reworks of Bollywood classics are a signature.",
    performanceDescription: "Two 45-minute sets; trio option for smaller spaces.",
    profile: u("1526478806334-5fd488fcaabc"),
    cover: u("1484876065684-b683cf17d276"),
    gallery: [u("1526478806334-5fd488fcaabc"), u("1484876065684-b683cf17d276"), u("1415201364774-f6f0bb35f28f")],
    languages: ["English", "Hindi"],
    baseCity: "Mumbai",
    performanceTypes: ["Cocktail jazz", "Supper club"],
    eventTypes: ["CORPORATE", "WEDDING", "PRIVATE_PARTY"],
    technicalRequirements: "Stage 12 × 10 ft, keyboard stand, bass amp, small drum kit.",
    teamSize: 4,
    minDuration: 60,
    maxDuration: 120,
    publicPriceLakh: 1,
    basePriceLakh: 0.75,
    commissionBps: 2000,
  },
];

const TESTIMONIALS = [
  {
    quote: "Our sangeet felt like a concert. The band read the room perfectly and the dance floor never emptied.",
    authorName: "Priya & Karan",
    authorRole: "Wedding in Udaipur",
    eventType: "WEDDING" as const,
    artistSlug: "aanya-rao",
  },
  {
    quote: "Professional from the first call to the final invoice. The awards night ran exactly to the minute.",
    authorName: "Head of Internal Communications",
    authorRole: "Annual awards, 1,200 guests",
    eventType: "CORPORATE" as const,
    artistSlug: "rohan-sethi",
  },
  {
    quote: "Our pro-night had the biggest turnout in the fest's history. The team handled every rider detail for us.",
    authorName: "Cultural Secretary",
    authorRole: "College festival, Bengaluru",
    eventType: "COLLEGE_FESTIVAL" as const,
    artistSlug: "the-monsoon-collective",
  },
  {
    quote: "Sax at sunset, then a DJ till late — exactly the night we imagined, with zero stress on our side.",
    authorName: "Ananya M.",
    authorRole: "40th birthday, Goa",
    eventType: "PRIVATE_PARTY" as const,
    artistSlug: "neil-dsouza-sax",
  },
];

export async function seedDemoContent(prisma: PrismaClient) {
  const categories = await prisma.artistCategory.findMany();
  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));

  for (const a of ARTISTS) {
    const catId = categoryId.get(a.category);
    if (!catId) throw new Error(`Unknown category ${a.category}`);
    const data = {
      stageName: a.stageName,
      categoryId: catId,
      tagline: a.tagline,
      shortBio: a.shortBio,
      biography: a.biography,
      performanceDescription: a.performanceDescription,
      profileImageUrl: a.profile,
      coverImageUrl: a.cover,
      languages: a.languages,
      baseCity: a.baseCity,
      performanceTypes: a.performanceTypes,
      eventTypes: a.eventTypes,
      technicalRequirements: a.technicalRequirements,
      teamSize: a.teamSize,
      minDurationMinutes: a.minDuration,
      maxDurationMinutes: a.maxDuration,
      publicPriceVisible: a.publicPriceLakh !== undefined,
      publicPriceFromPaise: a.publicPriceLakh !== undefined ? L(a.publicPriceLakh) : null,
      publicPriceNote: a.publicPriceLakh !== undefined ? "Indicative starting fee, excluding travel and taxes." : null,
      isFeatured: a.featured !== undefined,
      featuredOrder: a.featured ?? 0,
      availabilityVerifiedAt: a.availabilityVerified ? new Date() : null,
      status: "ACTIVE" as const,
      isDemo: true,
    };
    const artist = await prisma.artist.upsert({
      where: { slug: a.slug },
      update: data,
      create: { slug: a.slug, ...data },
    });
    await prisma.artistInternal.upsert({
      where: { artistId: artist.id },
      update: {},
      create: {
        artistId: artist.id,
        legalName: `${a.stageName} (demo)`,
        contactEmail: `${a.slug}@example.invalid`,
        contactPhone: "+910000000000",
        basePricePaise: L(a.basePriceLakh),
        commissionType: "PERCENTAGE",
        commissionRateBps: a.commissionBps,
        internalNotes: "Demo artist — fictional record for development.",
      },
    });
    await prisma.artistMedia.deleteMany({ where: { artistId: artist.id } });
    await prisma.artistMedia.createMany({
      data: a.gallery.map((url, i) => ({
        artistId: artist.id,
        type: "IMAGE" as const,
        provider: "EXTERNAL" as const,
        url,
        alt: `${a.stageName} — performance photo ${i + 1}`,
        sortOrder: i,
        isShowcase: i === 0 && a.featured !== undefined,
      })),
    });
  }

  await prisma.testimonial.deleteMany({ where: { isDemo: true } });
  const artistIds = new Map(
    (await prisma.artist.findMany({ select: { id: true, slug: true } })).map((a) => [a.slug, a.id]),
  );
  await prisma.testimonial.createMany({
    data: TESTIMONIALS.map((t, i) => ({
      quote: t.quote,
      authorName: t.authorName,
      authorRole: t.authorRole,
      eventType: t.eventType,
      artistId: artistIds.get(t.artistSlug) ?? null,
      rating: 5,
      isPublished: true,
      isDemo: true,
      sortOrder: i,
    })),
  });

  console.log(`  ✓ ${ARTISTS.length} demo artists, ${TESTIMONIALS.length} demo testimonials`);
}

export async function removeDemoContent(prisma: PrismaClient) {
  await prisma.testimonial.deleteMany({ where: { isDemo: true } });
  const demo = await prisma.artist.findMany({ where: { isDemo: true }, select: { id: true } });
  // Demo artists linked to real enquiries/bookings are archived instead of deleted.
  for (const { id } of demo) {
    const used = await prisma.bookingArtist.count({ where: { artistId: id } });
    if (used > 0) {
      await prisma.artist.update({ where: { id }, data: { status: "ARCHIVED", archivedAt: new Date() } });
    } else {
      await prisma.enquiryArtist.deleteMany({ where: { artistId: id } });
      await prisma.enquiry.updateMany({ where: { sourceArtistId: id }, data: { sourceArtistId: null } });
      await prisma.artist.delete({ where: { id } });
    }
  }
}
