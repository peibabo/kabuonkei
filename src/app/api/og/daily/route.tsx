import { ImageResponse } from "next/og";
import {
  getSentimentColor,
  getSentimentDescription,
  getSentimentLevel,
} from "@/lib/sentiment";
import { OG_CHAR_SET, SIZE, THERMOMETER_SVG } from "./_constants";
import { loadGoogleFont } from "./_lib/fonts";
import {
  formatJstDateLabel,
  labelFromIsoDate,
  parseScore,
} from "./_lib/params";
import ScoreCard from "./_components/ScoreCard";

export const runtime = "nodejs";
// クエリパラメータで渡されたスコアだけで描画するため外部データ依存なし。
// ただし静的プリレンダーは意味がないので明示的に dynamic 化。
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const japanScore = parseScore(searchParams.get("jp"));
  const usScore = parseScore(searchParams.get("us"));
  const dateParam = searchParams.get("date");

  const dateLabel =
    (dateParam && labelFromIsoDate(dateParam)) || formatJstDateLabel();
  const japanLabel = japanScore != null ? getSentimentLevel(japanScore) : "—";
  const usLabel = usScore != null ? getSentimentLevel(usScore) : "—";
  const japanDesc =
    japanScore != null ? getSentimentDescription(japanScore) : "";
  const usDesc = usScore != null ? getSentimentDescription(usScore) : "";
  const japanColor =
    japanScore != null ? getSentimentColor(japanScore) : "#6b7280";
  const usColor = usScore != null ? getSentimentColor(usScore) : "#6b7280";

  const [boldFont, mediumFont] = await Promise.all([
    loadGoogleFont("Noto+Sans+JP:wght@900", OG_CHAR_SET),
    loadGoogleFont("Noto+Sans+JP:wght@500", OG_CHAR_SET),
  ]);

  const fonts: {
    name: string;
    data: ArrayBuffer;
    style: "normal";
    weight: 500 | 900;
  }[] = [];
  if (boldFont) {
    fonts.push({
      name: "NotoSansJP",
      data: boldFont,
      style: "normal",
      weight: 900,
    });
  }
  if (mediumFont) {
    fonts.push({
      name: "NotoSansJP",
      data: mediumFont,
      style: "normal",
      weight: 500,
    });
  }

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
          padding: 60,
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
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={svgDataUri} width={72} height={72} alt="thermometer" />
            <div
              style={{
                fontSize: 64,
                fontWeight: 900,
                color: "#111827",
                letterSpacing: -2,
              }}
            >
              株温計
            </div>
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 500,
              color: "#1f2937",
              background: "#ffffff",
              padding: "8px 24px",
              borderRadius: 9999,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            {`${dateLabel} 寄り前`}
          </div>
        </div>

        <div
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: "#4b5563",
            marginTop: 24,
            marginBottom: 16,
          }}
        >
          前営業日引け時点の市場温度
        </div>

        <div style={{ display: "flex", gap: 32, marginTop: 8 }}>
          <ScoreCard
            flag="🇯🇵"
            country="日本"
            score={japanScore}
            level={japanLabel}
            desc={japanDesc}
            color={japanColor}
          />
          <ScoreCard
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
            fontSize: 24,
            fontWeight: 500,
            color: "#6b7280",
            marginTop: 16,
            textAlign: "right",
          }}
        >
          kabuonkei.com
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
