import { ImageResponse } from "next/og";
import { fetchAllMarketData } from "@/lib/market-data";
import {
  getSentimentColor,
  getSentimentDescription,
  getSentimentLevel,
} from "@/lib/sentiment";

export const runtime = "nodejs";
// Bot からの fetch に対してサーバー側の 15 分キャッシュと揃える
export const revalidate = 900;

const SIZE = { width: 1200, height: 630 } as const;

const THERMOMETER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<path d="M16 2 C14 2 12.5 3.5 12.5 5.5 V18 C10.3 19.3 9 21.7 9 24.3 C9 28.2 12.1 31.3 16 31.3 C19.9 31.3 23 28.2 23 24.3 C23 21.7 21.7 19.3 19.5 18 V5.5 C19.5 3.5 18 2 16 2 Z" fill="#1f2937"/>
<path d="M16 3.8 C14.7 3.8 13.8 4.7 13.8 6 V18.8 C11.9 19.8 10.6 21.8 10.6 24.3 C10.6 27.3 13 29.7 16 29.7 C19 29.7 21.4 27.3 21.4 24.3 C21.4 21.8 20.1 19.8 18.2 18.8 V6 C18.2 4.7 17.3 3.8 16 3.8 Z" fill="#ffffff"/>
<circle cx="16" cy="24.3" r="3.8" fill="#ef4444"/>
<rect x="14.7" y="12" width="2.6" height="12.5" fill="#ef4444"/>
</svg>`;

async function loadGoogleFont(
  family: string,
  text: string,
): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`;
    const cssRes = await fetch(url);
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format/);
    if (!match) return null;
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

function formatJstDateLabel(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][jst.getUTCDay()];
  return `${month}/${day}(${weekday})`;
}

export async function GET() {
  let japanScore: number | null = null;
  let usScore: number | null = null;
  try {
    const data = await fetchAllMarketData();
    japanScore = data.japanFearGreed?.score ?? null;
    usScore = data.fearGreed?.score ?? null;
  } catch (err) {
    console.error("市場データ取得失敗 (og/daily):", err);
  }

  const dateLabel = formatJstDateLabel();
  const japanLabel = japanScore != null ? getSentimentLevel(japanScore) : "—";
  const usLabel = usScore != null ? getSentimentLevel(usScore) : "—";
  const japanDesc =
    japanScore != null ? getSentimentDescription(japanScore) : "";
  const usDesc = usScore != null ? getSentimentDescription(usScore) : "";
  const japanColor = japanScore != null ? getSentimentColor(japanScore) : "#6b7280";
  const usColor = usScore != null ? getSentimentColor(usScore) : "#6b7280";

  const charSet =
    "株温計今日の相場熱い冷たい日本米国市場の温度をひと目で前営業日引け時点寄り前チェック極寒冷え込み平温過熱沸騰総悲観弱気中立強気総楽観月火水木金土日";
  const [boldFont, mediumFont] = await Promise.all([
    loadGoogleFont("Noto+Sans+JP:wght@900", charSet),
    loadGoogleFont("Noto+Sans+JP:wght@500", charSet),
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
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
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
            {dateLabel} 寄り前
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

        {/* 日米スコア並び */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 8,
            flex: 1,
          }}
        >
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
            display: "flex",
            justifyContent: "flex-end",
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

function ScoreCard({
  flag,
  country,
  score,
  level,
  desc,
  color,
}: {
  flag: string;
  country: string;
  score: number | null;
  level: string;
  desc: string;
  color: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        borderRadius: 24,
        padding: 32,
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        borderTop: `8px solid ${color}`,
      }}
    >
      <div
        style={{
          fontSize: 40,
          fontWeight: 500,
          color: "#1f2937",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 56 }}>{flag}</span>
        {country}
      </div>
      <div
        style={{
          fontSize: 140,
          fontWeight: 900,
          color,
          lineHeight: 1,
          marginTop: 12,
          letterSpacing: -4,
        }}
      >
        {score ?? "—"}
      </div>
      <div
        style={{
          fontSize: 48,
          fontWeight: 900,
          color: "#111827",
          marginTop: 12,
        }}
      >
        {level}
      </div>
      {desc ? (
        <div
          style={{
            fontSize: 30,
            fontWeight: 500,
            color: "#4b5563",
            marginTop: 4,
          }}
        >
          ({desc})
        </div>
      ) : null}
    </div>
  );
}
