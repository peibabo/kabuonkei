import { ImageResponse } from "next/og";
import { buildNotoSansJpFonts } from "@/lib/og/fonts";
import { THERMOMETER_SVG } from "@/lib/og/thermometer-svg";
import { getMarginRatioAnalysis } from "@/lib/margin-ratio-analysis";

export const alt = "信用倍率 × 株温計 — 過去10年の徹底検証";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const analysis = getMarginRatioAnalysis();
  const latest = analysis.latestContext;
  const quartiles = analysis.ratioQuartiles;

  const charSet =
    "信用倍率株温計過去年間徹底検証日経どう動いたか最新の倍期間週分析記事kabuonkei";
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
            "linear-gradient(135deg, #eff6ff 0%, #dbeafe 45%, #bfdbfe 100%)",
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
              fontSize: 72,
              fontWeight: 900,
              color: "#0f172a",
              lineHeight: 1.1,
              marginBottom: 24,
            }}
          >
            信用倍率 × 株温計
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 500,
              color: "#1e293b",
              lineHeight: 1.4,
              marginBottom: 40,
            }}
          >
            過去10年を徹底検証 — その後、日経225 はどう動いたか
          </div>

          <div
            style={{
              display: "flex",
              gap: 32,
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
                border: "1px solid #cbd5e1",
              }}
            >
              <span style={{ fontSize: 18, color: "#64748b" }}>
                最新の信用倍率
              </span>
              <span style={{ fontSize: 40, fontWeight: 800, color: "#0f172a" }}>
                {latest.ratio.toFixed(2)} 倍
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: "16px 24px",
                borderRadius: 16,
                border: "1px solid #cbd5e1",
              }}
            >
              <span style={{ fontSize: 18, color: "#64748b" }}>過去の中央値</span>
              <span style={{ fontSize: 40, fontWeight: 800, color: "#0f172a" }}>
                {quartiles.p50.toFixed(2)} 倍
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: "16px 24px",
                borderRadius: 16,
                border: "1px solid #cbd5e1",
              }}
            >
              <span style={{ fontSize: 18, color: "#64748b" }}>サンプル数</span>
              <span style={{ fontSize: 40, fontWeight: 800, color: "#0f172a" }}>
                {analysis.sampleSize} 週
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: "#475569",
            borderTop: "1px solid #94a3b840",
            paddingTop: 16,
          }}
        >
          kabuonkei.com/analysis/margin-ratio-temperature
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
