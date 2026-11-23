/**
 * Marketing imagery for public pages (Unsplash License). Artist photography
 * comes from the database / Cloudinary, not from here. Swap these for the
 * agency's own event photography when available.
 */
const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}`;

export const IMAGES = {
  heroCrowdGold: unsplash("1470229722913-7c0e2dbbafd3"),
  heroFestivalViolet: unsplash("1506157786151-b8491531f063"),
  heroLightBeams: unsplash("1522158637959-30385a09e0da"),
  heroStageBlue: unsplash("1499364615650-ec38552f4f34"),
  crowdHearts: unsplash("1429962714451-bb934ecdc4ec"),
  crowdHands: unsplash("1478147427282-58a87a120781"),
  crowdRed: unsplash("1545128485-c400e7702796"),
  confettiCrowd: unsplash("1492684223066-81342ee5ff30"),
  confettiStage: unsplash("1533174072545-7a4b6ad7a6c3"),
  colourFestival: unsplash("1514525253161-7a46d19cd819"),
  stageRig: unsplash("1501612780327-45045538702b"),
  stageRigBlue: unsplash("1563841930606-67e2bce48b78"),
  theatreStage: unsplash("1585699324551-f6c309eedeca"),
  conference: unsplash("1540575467063-178a50c2df87"),
  weddingBride: unsplash("1519741497674-611481863552"),
  weddingTable: unsplash("1511795409834-ef04bbd61622"),
  danceFloor: unsplash("1504609813442-a8924e83f76e"),
  clubParty: unsplash("1574391884720-bbc3740c59d1"),
  cheers: unsplash("1541532713592-79a0317b6b77"),
  vintageMic: unsplash("1511671782779-c97d3d27a1d4"),
  violetMic: unsplash("1485579149621-3123dd979885"),
  darkMic: unsplash("1516280440614-37939bbacd81"),
  vinyl: unsplash("1468164016595-6108e4c60c8b"),
  sheetMusic: unsplash("1507838153414-b4b713384a76"),
  violinists: unsplash("1465847899084-d164df4dedc6"),
  piano: unsplash("1520523839897-bd0b52f945a0"),
  saxophone: unsplash("1415201364774-f6f0bb35f28f"),
  drums: unsplash("1514320291840-2e0a9bf2a9ae"),
  danceTroupe: unsplash("1503095396549-807759245b35"),
  dancerSolo: unsplash("1547153760-18fc86324498"),
  djCrowd: unsplash("1496337589254-7e19d01cec44"),
  bandStage: unsplash("1521337581100-8ca9a73a5f79"),
  bandDark: unsplash("1526478806334-5fd488fcaabc"),
  neonSign: unsplash("1508700115892-45ecd05ae2ad"),
} as const;

/** Build a sized Unsplash URL (they support on-the-fly resizing). */
export function sized(url: string, width: number, quality = 70): string {
  if (!url.startsWith("https://images.unsplash.com/")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}w=${width}&q=${quality}&auto=format&fit=crop`;
}
