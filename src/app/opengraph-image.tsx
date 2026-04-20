import { ImageResponse } from "next/og";
import { buildNotoSansJpFonts } from "@/lib/og/fonts";
import { THERMOMETER_SVG } from "@/lib/og/thermometer-svg";

export const alt = "株温計 - 今日の相場、熱い？冷たい？";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CHAR_SET = "株温計今日の相場熱い冷たい日本米国市場の温度をひと目で";

export default async function Image() {
  const fonts = await buildNotoSansJpFonts(CHAR_SET);

  const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(THERMOMETER_SVG).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #fff7ed 0%, #fed7aa 45%, #fca5a5 100%)",
          fontFamily: "NotoSansJP, sans-serif",
          padding: 80,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={svgDataUri}
          width={160}
          height={160}
          alt="thermometer"
          style={{ marginBottom: 12 }}
        />
        <div
          style={{
            fontSize: 150,
            fontWeight: 900,
            color: "#111827",
            letterSpacing: -4,
            lineHeight: 1.1,
            paddingBottom: 12,
          }}
        >
          株温計
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 500,
            color: "#1f2937",
            marginTop: 24,
          }}
        >
          今日の相場、熱い？冷たい？
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "#4b5563",
            marginTop: 20,
            opacity: 0.85,
          }}
        >
          日本 × 米国 市場の温度をひと目で
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
