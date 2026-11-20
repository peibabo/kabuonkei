import { ImageResponse } from "next/og";
import { buildNotoSansJpFonts } from "@/lib/og/fonts";
import { THERMOMETER_SVG } from "@/lib/og/thermometer-svg";
import {
  getNikkeiMaDeviationAnalysis,
  MA_DEVIATION_ARTICLE,
  winCount,
} from "@/lib/nikkei-ma-deviation-analysis";

export const alt = `${MA_DEVIATION_ARTICLE.title} — 株温計`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const analysis = getNikkeiMaDeviationAnalysis();
  const th = analysis.extremeThreshold;
  const high = analysis.episodeSummary.high["6m"];
  const low = analysis.episodeSummary.low["6m"];
  const base = analysis.baseline.all["6m"];
  const lowWins = winCount(low);
  const firstYear = analysis.dataRange.from.slice(0, 4);

  // 描画する文字列からフォントのサブセットを作る（文言を変えても字が抜けないように）
  const texts = {
    heading: "日経平均の125日線乖離率は買い時・売り時のサイン？",
    sub: `${firstYear}年以降の${analysis.dayCount.toLocaleString("ja-JP")}営業日で検証`,
    leftLabel: `上に+${th}%以上離れた後、6ヶ月後に上がった割合`,
    leftValue: `${high.winRate.toFixed(0)}%`,
    leftNote: `${high.sampleSize}回。普段の日は ${base.winRate.toFixed(0)}%`,
    rightLabel: `下に−${th}%以下まで離れた後、6ヶ月後に上がったのは`,
    rightValue: `${low.sampleSize}回中 ${lowWins}回`,
    rightNote: `上がった割合 ${low.winRate.toFixed(0)}%（普段の日 ${base.winRate.toFixed(0)}%）`,
    footerLeft: "kabuonkei.com/analysis",
    footerRight: `${analysis.dataRange.from} 〜 ${analysis.dataRange.to}`,
  };
  const charSet = "株温計分析記事" + Object.values(texts).join("");
  const fonts = await buildNotoSansJpFonts(charSet);

  const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(
    THERMOMETER_SVG
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
            "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
          fontFamily: "NotoSansJP, sans-serif",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={svgDataUri} width={56} height={56} alt="thermometer" />
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: -1,
            }}
          >
            株温計
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "#475569",
              marginLeft: 8,
              marginTop: 10,
            }}
          >
            分析記事
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
              fontSize: 40,
              fontWeight: 900,
              color: "#0f172a",
              lineHeight: 1.2,
              marginBottom: 12,
            }}
          >
            {texts.heading}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 500,
              color: "#334155",
              marginBottom: 28,
            }}
          >
            {texts.sub}
          </div>

          <div style={{ display: "flex", gap: 24 }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: 24,
                borderRadius: 20,
                border: "1px solid #cbd5e1",
              }}
            >
              <span style={{ fontSize: 19, fontWeight: 700, color: "#475569" }}>
                {texts.leftLabel}
              </span>
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  color: "#dc2626",
                  marginTop: 8,
                }}
              >
                {texts.leftValue}
              </span>
              <span style={{ fontSize: 18, color: "#64748b", marginTop: 4 }}>
                {texts.leftNote}
              </span>
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: 24,
                borderRadius: 20,
                border: "1px solid #cbd5e1",
              }}
            >
              <span style={{ fontSize: 19, fontWeight: 700, color: "#475569" }}>
                {texts.rightLabel}
              </span>
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  color: "#0f172a",
                  marginTop: 8,
                }}
              >
                {texts.rightValue}
              </span>
              <span style={{ fontSize: 18, color: "#64748b", marginTop: 4 }}>
                {texts.rightNote}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 18,
            color: "#475569",
            borderTop: "1px solid #cbd5e1",
            paddingTop: 12,
          }}
        >
          <span>{texts.footerLeft}</span>
          <span>{texts.footerRight}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    }
  );
}
