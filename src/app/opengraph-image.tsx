import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const bars = [0.45, 0.8, 0.55, 1, 0.7, 0.4, 0.9, 0.6, 0.75, 0.5, 0.95, 0.65];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "radial-gradient(circle at 15% 20%, #4c1d95 0%, #07060f 55%), #07060f",
          color: "#f6f4ff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, letterSpacing: 10, fontWeight: 700 }}>
          {siteConfig.name.toUpperCase()}
          <span style={{ color: "#e935c1" }}>.</span>
        </div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.02, maxWidth: 980, letterSpacing: -2 }}>
          {siteConfig.tagline}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 26, color: "#a8a3c2" }}>Artist booking for weddings, corporate events & festivals</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ width: 10, height: 90 * h, borderRadius: 5, background: "linear-gradient(#e935c1, #7c3aed)" }} />
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
