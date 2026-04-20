import { ImageResponse } from "next/og";
import {
  getSentimentColor,
  getSentimentDescription,
  getSentimentLevel,
} from "@/lib/sentiment";
import { buildNotoSansJpFonts } from "@/lib/og/fonts";
import { THERMOMETER_SVG } from "@/lib/og/thermometer-svg";
import { fetchAllMarketData } from "@/lib/market-data";
import { formatJstDateLabel } from "@/lib/jst-date";
import MiniScoreCard from "./_components/MiniScoreCard";
import { WIDGET_CHAR_SET, WIDGET_SIZE } from "./_constants";

export const runtime = "nodejs";
export const revalidate = 900;

export async function GET() {
  const market = await fetchAllMarketData().catch(() => null);
  const jpScore = market?.japanFearGreed?.score ?? null;
  const usScore = market?.fearGreed?.score ?? null;

  const dateLabel = formatJstDateLabel();
  const jpLabel = jpScore != null ? getSentimentLevel(jpScore) : "—";
  const usLabel = usScore != null ? getSentimentLevel(usScore) : "—";
  const jpDesc = jpScore != null ? getSentimentDescription(jpScore) : "";
  const usDesc = usScore != null ? getSentimentDescription(usScore) : "";
  const jpColor = jpScore != null ? getSentimentColor(jpScore) : "#6b7280";
  const usColor = usScore != null ? getSentimentColor(usScore) : "#6b7280";

  const fonts = await buildNotoSansJpFonts(WIDGET_CHAR_SET);
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
            "linear-gradient(135deg, #fff7ed 0%, #fed7aa 55%, #fca5a5 100%)",
          fontFamily: "NotoSansJP, sans-serif",
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={svgDataUri} width={40} height={40} alt="thermometer" />
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: "#111827",
                letterSpacing: -1,
              }}
            >
              株温計
            </div>
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: "#1f2937",
              background: "#ffffff",
              padding: "4px 14px",
              borderRadius: 9999,
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}
          >
            {dateLabel}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 12,
          }}
        >
          <MiniScoreCard
            flag="🇯🇵"
            country="日本"
            score={jpScore}
            level={jpLabel}
            desc={jpDesc}
            color={jpColor}
          />
          <MiniScoreCard
            flag="🇺🇸"
            country="米国"
            score={usScore}
            level={usLabel}
            desc={usDesc}
            color={usColor}
          />
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 16,
            fontWeight: 500,
            color: "#6b7280",
            marginTop: "auto",
            paddingTop: 6,
            justifyContent: "flex-end",
          }}
        >
          kabuonkei.com
        </div>
      </div>
    ),
    {
      ...WIDGET_SIZE,
      fonts: fonts.length > 0 ? fonts : undefined,
      headers: {
        "Cache-Control":
          "public, s-maxage=900, stale-while-revalidate=3600",
      },
    },
  );
}
