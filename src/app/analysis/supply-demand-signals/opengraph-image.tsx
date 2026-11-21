import { ImageResponse } from "next/og";
import { buildNotoSansJpFonts } from "@/lib/og/fonts";
import { THERMOMETER_SVG } from "@/lib/og/thermometer-svg";
import {
  findSupplyBand,
  getSupplyDemandAnalysis,
  SUPPLY_DEMAND_ARTICLE,
  supplyWinCount,
} from "@/lib/supply-demand-analysis";

export const alt = `${SUPPLY_DEMAND_ARTICLE.title} — 株温計`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const analysis = getSupplyDemandAnalysis();
  const { flow, margin } = analysis;
  const flowLow = findSupplyBand(flow, "very-low").all["6m"];
  const flowBase = flow.baseline.all["6m"];
  const marginExt = margin.extremeSummary["6m"];
  const marginBase = margin.baseline.all["6m"];

  // 描画する文字列からフォントのサブセットを作る（文言を変えても字が抜けないように）
  const texts = {
    heading: "海外投資家の売り越し・信用買い残の減少は買い時？",
    sub: "JPX の需給データと日経平均のその後を、公表日のずれも再現して検証",
    leftLabel: "海外投資家が4週で1兆円以上売り越した後、6ヶ月後に上がった割合",
    leftValue: flowLow.sampleSize > 0 ? `${flowLow.winRate.toFixed(0)}%` : "—",
    leftNote: `日数ベース。普段の日は ${flowBase.winRate.toFixed(0)}%（回数で数えると ${flow.extremeSummary["6m"].winRate.toFixed(0)}%）`,
    rightLabel: "信用買い残が4週で10%以上減った後、6ヶ月後に上がったのは",
    rightValue: `${marginExt.sampleSize}回中 ${supplyWinCount(marginExt)}回`,
    rightNote: `上がった割合 ${marginExt.winRate.toFixed(0)}%（普段の日 ${marginBase.winRate.toFixed(0)}%）`,
    footerLeft: "kabuonkei.com/analysis",
    footerRight: `${margin.dataRange.from} 〜 ${margin.dataRange.to}`,
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
