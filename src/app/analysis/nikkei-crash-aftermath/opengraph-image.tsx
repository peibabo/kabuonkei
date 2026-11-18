import { ImageResponse } from "next/og";
import { buildNotoSansJpFonts } from "@/lib/og/fonts";
import { THERMOMETER_SVG } from "@/lib/og/thermometer-svg";
import { getNikkeiCrashAnalysis } from "@/lib/nikkei-crash-analysis";

export const alt =
  "日経平均が1日5%以上下げた後どうなった？— 1985年以降の急落を全件検証 — 株温計";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export default async function Image() {
  const analysis = getNikkeiCrashAnalysis();
  const ep = analysis.summary.episodes["3m"];
  const base = analysis.summary.baseline["3m"];
  const dd = analysis.summary.drawdown;
  const firstYear = analysis.dataRange.from.slice(0, 4);

  // 描画する文字列からフォントのサブセットを作る（文言を変えても字が抜けないように）
  const texts = {
    heading: "日経平均が1日5%以上下げた後どうなった？",
    sub: `${firstYear}年以降の急落を全件検証`,
    leftLabel: "急落した日に買うと3ヶ月後",
    leftValue: formatPct(ep.avgReturn),
    leftNote: `上がった割合 ${ep.winRate.toFixed(0)}%（普段の日 ${base.winRate.toFixed(0)}%）`,
    rightLabel: "でも急落した日が底だったのは",
    rightValue: `${dd.count}回中 ${dd.bottomOnCrashDay}回だけ`,
    rightNote: `その後さらに平均 ${dd.avgDrawdown.toFixed(1)}% 下げた`,
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
              fontSize: 48,
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
              <span style={{ fontSize: 20, fontWeight: 700, color: "#475569" }}>
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
              <span style={{ fontSize: 20, fontWeight: 700, color: "#475569" }}>
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
