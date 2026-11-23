import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { SERVICES } from "@/content/services";
import { getAllArtistSlugs } from "@/server/services/public/catalogue";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const artists = await getAllArtistSlugs();
  const staticPages = ["", "/artists", "/categories", "/services", "/experiences", "/about", "/contact", "/book-an-artist"];
  return [
    ...staticPages.map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...SERVICES.map((s) => ({ url: `${base}/services/${s.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...artists.map((a) => ({ url: `${base}/artists/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
