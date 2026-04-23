import { ImageResponse } from "next/og";
import { buildNotoSansJpFonts } from "@/lib/og/fonts";
import { THERMOMETER_SVG } from "@/lib/og/thermometer-svg";
import { getVixSp500Analysis } from "@/lib/vix-sp500-analysis";

export const alt =
  "VIX が 30 を超えた日、その後 S&P500 はどう動いたか？— 過去20年の検証";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const analysis = getVixSp500Analysis();
  const latest = analysis.latestContext;
  const quartiles = analysis.vixQuantiles;
  const highBand = analysis.primary.bands.find((b) => b.band === "30〜");
  const high3mAvg = highBand?.sp500["3m"].avgReturn ?? 0;
  const high3mWin = highBand?.sp500["3m"].winRate ?? 0;

  const charSet =
    "VIXが年超えた日過去の徹底検証恐怖指数平均リターン勝率中央値最新サンプル週その後どう動いたか株温計分析記事kabuonkei";
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
            "linear-gradient(135deg, #fef2f2 0%, #fecaca 45%, #fca5a5 100%)",
          fontFamily: "NotoSansJP, sans-serif",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={svgDataUri} width={64} height={64} alt="thermometer" />
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: "#450a0a",
              letterSpacing: -1,
            }}
          >
            株温計
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "#7f1d1d",
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
              fontSize: 64,
              fontWeight: 900,
              color: "#7f1d1d",
              lineHeight: 1.1,
              marginBottom: 24,
            }}
          >
            VIX 30 超えは危険？
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 500,
              color: "#450a0a",
              lineHeight: 1.4,
              marginBottom: 36,
            }}
          >
            過去20年を集計 — S&P500 3ヶ月後 平均 {high3mAvg >= 0 ? "+" : ""}
            {high3mAvg.toFixed(1)}% / 勝率 {high3mWin.toFixed(0)}%
          </div>

          <div
            style={{
              display: "flex",
              gap: 24,
              fontSize: 22,
              color: "#334155",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: "16px 24px",
                borderRadius: 16,
                border: "1px solid #fca5a5",
              }}
            >
              <span style={{ fontSize: 18, color: "#7f1d1d" }}>最新の VIX</span>
              <span style={{ fontSize: 40, fontWeight: 800, color: "#450a0a" }}>
                {latest.vix.toFixed(1)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: "16px 24px",
                borderRadius: 16,
                border: "1px solid #fca5a5",
              }}
            >
              <span style={{ fontSize: 18, color: "#7f1d1d" }}>過去の中央値</span>
              <span style={{ fontSize: 40, fontWeight: 800, color: "#450a0a" }}>
                {quartiles.p50.toFixed(1)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: "16px 24px",
                borderRadius: 16,
                border: "1px solid #fca5a5",
              }}
            >
              <span style={{ fontSize: 18, color: "#7f1d1d" }}>サンプル数</span>
              <span style={{ fontSize: 40, fontWeight: 800, color: "#450a0a" }}>
                {analysis.sampleSize.toLocaleString()} 日
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: "#7f1d1d",
            borderTop: "1px solid #fca5a540",
            paddingTop: 16,
          }}
        >
          kabuonkei.com/analysis/vix-threshold-sp500
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
