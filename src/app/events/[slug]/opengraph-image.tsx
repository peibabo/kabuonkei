import { ImageResponse } from "next/og";
import { buildNotoSansJpFonts } from "@/lib/og/fonts";
import { THERMOMETER_SVG } from "@/lib/og/thermometer-svg";
import { getEventBySlug, getEventsMeta } from "@/lib/events";

export const alt = "株温計 - イベント詳細";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  return getEventsMeta().map((e) => ({ slug: e.slug }));
}

export default async function Image({
  params,
}: {
  params: { slug: string };
}) {
  const event = getEventBySlug(params.slug) ?? {
    slug: params.slug,
    date: "",
    label: "イベント",
    oneLiner: "",
  };

  // フォントが拾うべき文字集合（イベント固有の文字を含める）
  const charSet =
    "株温計イベント今日の相場熱い冷たい日本米国市場の温度年月日" +
    event.label +
    event.oneLiner;
  const fonts = await buildNotoSansJpFonts(charSet);

  const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(
    THERMOMETER_SVG,
  ).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #fff7ed 0%, #fed7aa 45%, #fca5a5 100%)",
          fontFamily: "NotoSansJP, sans-serif",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={svgDataUri}
            width={72}
            height={72}
            alt="thermometer"
          />
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: "#111827",
              letterSpacing: -1,
            }}
          >
            株温計
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: "#6b7280",
              marginLeft: 8,
              marginTop: 12,
            }}
          >
            イベント詳細
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 500,
              color: "#4b5563",
              marginBottom: 12,
            }}
          >
            📅 {event.date}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 80,
              fontWeight: 900,
              color: "#111827",
              lineHeight: 1.15,
              marginBottom: 28,
            }}
          >
            {event.label}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 400,
              color: "#374151",
              lineHeight: 1.5,
            }}
          >
            {event.oneLiner}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 500,
            color: "#6b7280",
            borderTop: "1px solid #fca5a540",
            paddingTop: 18,
          }}
        >
          日米市場の温度とその後の動きを確認 → kabuonkei.com
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
